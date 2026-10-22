import WebSocket from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { douyinConfigSchema } from '@contracts/config'
import { PlatformError } from '@contracts/errors'
import type {
  PlatformAdapter,
  PlatformContext,
  PlatformStatus
} from '@contracts/platform'
import { decodeDouyinFrame, encodeDouyinAck, normalizeDouyinRoom, type DouyinMessage } from './protocol'
import { LocalDouyinSigner, type DouyinSignResult } from './signer'
import { proxyUrlFor } from '../probe'
import { douyinAdapterFactory } from './index'

const RECONNECT_DELAY_MS = 5_000

/**
 * 抖音只读弹幕适配器。
 *
 * 连接分两步：本地匿名 cookie + 签名脚本换取短期 WSS URL，然后只接收
 * webcast 推送并解析弹幕/礼物/进场。适配器没有发送用户内容的方法，
 * 心跳只用于维持平台连接；签名算法更新时随应用版本替换 assets/sign.js。
 */
export class DouyinAdapter implements PlatformAdapter {
  readonly descriptor = douyinAdapterFactory.descriptor

  private status: PlatformStatus = { phase: 'disconnected' }
  private socket: WebSocket | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = true
  private attempt = 0
  private roomId = ''
  private sourceRoomId = ''
  private signal: AbortSignal | null = null
  private readonly signer: LocalDouyinSigner

  constructor(private readonly context: PlatformContext) {
    this.signer = new LocalDouyinSigner(context.network)
  }

  async connect(config: unknown, signal: AbortSignal): Promise<void> {
    const parsed = douyinConfigSchema.parse(config)
    const roomId = normalizeDouyinRoom(parsed.roomId)
    if (roomId.length === 0) throw new PlatformError('config', '请先填写抖音直播间号或链接')
    if (signal.aborted) throw new PlatformError('network', '连接已取消')

    this.disposed = false
    this.signal = signal
    this.sourceRoomId = roomId
    this.roomId = roomId
    this.attempt = 0
    signal.addEventListener('abort', () => void this.disconnect(), { once: true })
    this.setStatus({ phase: 'connecting' })

    try {
      const signed = await this.signer.sign(roomId, signal)
      this.roomId = signed.roomId
      await this.openSocket(signed, signal)
      this.setStatus({
        phase: 'connected',
        detail: signed.title.length > 0 ? signed.title : '抖音直播间 ' + signed.roomId,
        connectedAt: this.context.clock.now()
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.setStatus({ phase: 'error', detail: message })
      throw error instanceof PlatformError ? error : new PlatformError('network', message)
    }
  }

  async disconnect(): Promise<void> {
    this.disposed = true
    this.clearTimers()
    const socket = this.socket
    this.socket = null
    if (socket !== null) {
      socket.removeAllListeners()
      socket.close()
    }
    this.setStatus({ phase: 'disconnected' })
  }

  snapshot(): PlatformStatus {
    return this.status
  }

  private async openSocket(signed: DouyinSignResult, signal: AbortSignal): Promise<void> {
    const proxyUrl = proxyUrlFor(signed.wssUrl, this.context.network)
    const insecure = this.context.network.allowInsecureTls
    const agent = proxyUrl === null
      ? undefined
      : new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: !insecure })
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(signed.wssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...signed.headers
        },
        rejectUnauthorized: !insecure,
        ...(agent === undefined ? {} : { agent })
      })
      this.socket = socket
      let settled = false
      const timeout = setTimeout(() => {
        settled = true
        socket.close()
        reject(new PlatformError('network', '连接抖音弹幕服务器超时'))
      }, 12_000)

      socket.on('open', () => {
        clearTimeout(timeout)
        settled = true
        this.startHeartbeat(signed)
        resolve()
      })
      socket.on('message', (raw) => {
        try {
          const frame = decodeDouyinFrame(toBuffer(raw))
          if (frame.needAck && frame.internalExt.length > 0) {
            socket.send(encodeDouyinAck(frame.internalExt))
          }
          this.handleMessages(frame.messages)
        } catch (error) {
          this.context.logger.warn('douyin', '抖音帧解析失败', String(error))
        }
      })
      socket.on('error', (error) => {
        if (!settled) {
          clearTimeout(timeout)
          settled = true
          reject(new PlatformError('network', '抖音弹幕连接失败：' + error.message))
        } else {
          this.context.logger.warn('douyin', '抖音弹幕连接异常', error.message)
        }
      })
      socket.on('close', () => {
        this.clearHeartbeat()
        if (this.socket === socket) this.socket = null
        if (!settled) {
          clearTimeout(timeout)
          settled = true
          reject(new PlatformError('network', '抖音弹幕连接被关闭'))
          return
        }
        if (!this.disposed && signal.aborted === false) this.scheduleReconnect()
      })
    })
  }

  private handleMessages(messages: readonly DouyinMessage[]): void {
    const receivedAt = this.context.clock.now()
    for (const item of messages) {
      if (item.kind === 'chat') {
        this.context.emit({
          type: 'chat',
          message: {
            id: 'douyin-' + (item.msgId || String(receivedAt)),
            platform: 'douyin',
            roomId: this.roomId,
            userId: item.userId,
            userName: item.userName,
            text: item.text,
            receivedAt
          }
        })
      } else if (item.kind === 'gift') {
        this.context.emit({
          type: 'gift',
          gift: {
            id: 'douyin-' + (item.msgId || String(receivedAt)),
            platform: 'douyin',
            roomId: this.roomId,
            userId: item.userId,
            userName: item.userName,
            giftName: item.giftName,
            count: item.count,
            receivedAt
          }
        })
      } else {
        this.context.emit({
          type: 'member',
          member: {
            id: 'douyin-' + (item.msgId || String(receivedAt)),
            platform: 'douyin',
            roomId: this.roomId,
            userId: item.userId,
            userName: item.userName,
            kind: 'enter',
            receivedAt
          }
        })
      }
    }
  }

  private startHeartbeat(signed: DouyinSignResult): void {
    this.clearHeartbeat()
    const payloadHex = signed.heartbeat?.payloadHex ?? '3a026862'
    const interval = signed.heartbeat?.intervalMs ?? 10_000
    const payload = Buffer.from(payloadHex, 'hex')
    this.heartbeat = setInterval(() => {
      const socket = this.socket
      if (socket?.readyState === WebSocket.OPEN) socket.send(payload)
    }, interval)
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.signal === null) return
    this.attempt += 1
    this.setStatus({ phase: 'reconnecting', detail: '第 ' + this.attempt + ' 次重连' })
    this.reconnectTimer = setTimeout(() => void this.reconnect(), RECONNECT_DELAY_MS)
  }

  private async reconnect(): Promise<void> {
    if (this.disposed || this.signal === null) return
    try {
      const signed = await this.signer.sign(this.sourceRoomId, this.signal)
      this.roomId = signed.roomId
      await this.openSocket(signed, this.signal)
      this.attempt = 0
      this.setStatus({
        phase: 'connected',
        detail: signed.title.length > 0 ? signed.title : '抖音直播间 ' + signed.roomId,
        connectedAt: this.context.clock.now()
      })
    } catch (error) {
      this.context.logger.warn('douyin', '抖音重连失败', String(error))
      this.scheduleReconnect()
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat()
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat)
      this.heartbeat = null
    }
  }

  private setStatus(status: PlatformStatus): void {
    this.status = status
    this.context.emit({ type: 'status', status })
  }
}

function toBuffer(raw: WebSocket.RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw
  if (Array.isArray(raw)) return Buffer.concat(raw)
  return Buffer.from(raw)
}
