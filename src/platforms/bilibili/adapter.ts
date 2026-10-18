import { bilibiliConfigSchema } from '@contracts/config'
import { PlatformError } from '@contracts/errors'
import type {
  PlatformAdapter,
  PlatformAdapterFactory,
  PlatformContext,
  PlatformStatus
} from '@contracts/platform'
import WebSocket from 'ws'
import {
  authBody,
  decodePackets,
  encodePacket,
  OP_AUTH,
  OP_AUTH_REPLY,
  OP_HEARTBEAT,
  OP_MESSAGE,
  readChat,
  readGift,
  readJson,
  readMember
} from './protocol'
import { danmuInfoSchema, fingerSchema, navSchema, roomInitSchema } from './schema'
import { signWbi, wbiKeysFromUrls, type WbiKeys } from './wbi'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const API_TIMEOUT_MS = 12_000
const HEARTBEAT_MS = 30_000

interface RoomInfo {
  readonly roomId: number
  readonly liveStatus: number
}

/**
 * B站匿名弹幕适配器。
 *
 * 只读：不登录、不发弹幕。cookie 只在本次连接的内存里用于换取
 * danmu token，不写配置、不写日志。
 */
export class BilibiliAdapter implements PlatformAdapter {
  readonly descriptor = bilibiliAdapterFactory.descriptor

  private status: PlatformStatus = { phase: 'disconnected' }
  private socket: WebSocket | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = true
  private attempt = 0
  private activeRoomId = ''
  private buvid = ''
  private signal: AbortSignal | null = null
  private wbiKeys: WbiKeys | null = null
  private wbiFetchedAt = 0

  constructor(private readonly context: PlatformContext) {}

  async connect(config: unknown, signal: AbortSignal): Promise<void> {
    const parsed = bilibiliConfigSchema.parse(config)
    const roomId = normalizeRoomInput(parsed.roomId)
    if (roomId.length === 0) {
      throw new PlatformError('config', '请先填写直播间房间号')
    }
    if (signal.aborted) throw new PlatformError('network', '连接已取消')

    this.disposed = false
    this.signal = signal
    this.activeRoomId = roomId
    signal.addEventListener('abort', () => void this.disconnect(), { once: true })
    this.setStatus({ phase: 'connecting' })

    try {
      const room = await this.start(signal)
      this.attempt = 0
      this.setStatus({
        phase: 'connected',
        detail: describeRoom(room),
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

  private async start(signal: AbortSignal): Promise<RoomInfo> {
    const room = await this.resolveRoom(signal)
    const buvid = await this.fetchBuvid(signal)
    this.buvid = buvid?.buvid3 ?? ''
    const cookie = buvid === null ? '' : 'buvid3=' + buvid.buvid3 + '; buvid4=' + buvid.buvid4
    const info = await this.fetchDanmuInfo(room.roomId, cookie, signal)
    if (info.host_list.length === 0) {
      throw new PlatformError('protocol', 'B站没有返回可用的弹幕服务器')
    }

    this.activeRoomId = String(room.roomId)
    let lastError: Error | null = null
    for (const host of uniqueHosts(info.host_list)) {
      try {
        await this.openSocket(
          host.host,
          host.wss_port ?? host.port ?? 443,
          info.token,
          room.roomId,
          signal
        )
        return room
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.context.logger.warn('bilibili', '弹幕服务器 ' + host.host + ' 连接失败，换下一个', String(error))
      }
    }

    throw lastError ?? new PlatformError('network', '所有 B站弹幕服务器都连接失败')
  }

  private async resolveRoom(signal: AbortSignal): Promise<RoomInfo> {
    const data = await this.fetchJson(
      'https://api.live.bilibili.com/room/v1/Room/room_init?id=' + encodeURIComponent(this.activeRoomId),
      signal,
      ''
    )
    const parsed = roomInitSchema.safeParse(data)
    if (!parsed.success) throw new PlatformError('protocol', 'B站返回了无法解析的房间信息')
    if (parsed.data.code !== 0 || parsed.data.data === undefined) {
      throw new PlatformError('room-not-found', parsed.data.message ?? '房间不存在或暂未开播')
    }
    return {
      roomId: parsed.data.data.room_id,
      liveStatus: parsed.data.data.live_status ?? 0
    }
  }

  private async fetchBuvid(signal: AbortSignal): Promise<{ buvid3: string; buvid4: string } | null> {
    try {
      const data = await this.fetchJson(
        'https://api.bilibili.com/x/frontend/finger/spi',
        signal,
        '',
        'https://www.bilibili.com/'
      )
      const parsed = fingerSchema.safeParse(data)
      if (!parsed.success || parsed.data.code !== 0 || parsed.data.data === undefined) return null
      return { buvid3: parsed.data.data.b_3, buvid4: parsed.data.data.b_4 }
    } catch (error) {
      this.context.logger.warn('bilibili', '获取 buvid 失败，继续匿名连接', String(error))
      return null
    }
  }

  private async ensureWbiKeys(signal: AbortSignal): Promise<WbiKeys> {
    const now = this.context.clock.now()
    if (this.wbiKeys !== null && now - this.wbiFetchedAt < 30 * 60 * 1000) {
      return this.wbiKeys
    }

    const data = await this.fetchJson(
      'https://api.bilibili.com/x/web-interface/nav',
      signal,
      '',
      'https://www.bilibili.com/'
    )
    const parsed = navSchema.safeParse(data)
    const wbi = parsed.success ? parsed.data.data?.wbi_img : undefined
    if (wbi === undefined) {
      throw new PlatformError('protocol', 'B站没有返回 WBI 密钥，无法签名弹幕接口')
    }

    this.wbiKeys = wbiKeysFromUrls(wbi.img_url, wbi.sub_url)
    this.wbiFetchedAt = now
    return this.wbiKeys
  }

  private async fetchDanmuInfo(roomId: number, cookie: string, signal: AbortSignal) {
    const keys = await this.ensureWbiKeys(signal)
    const query = signWbi(
      { id: roomId, type: 0, web_location: 444.8 },
      keys,
      Math.floor(this.context.clock.now() / 1000)
    )
    const data = await this.fetchJson(
      'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?' + query,
      signal,
      cookie
    )
    let parsed = danmuInfoSchema.safeParse(data)
    if (!parsed.success) throw new PlatformError('protocol', 'B站返回了无法解析的弹幕服务器信息')

    // -352 常见于 WBI 密钥过期或风控；强制刷新一次密钥再试。
    if (parsed.data.code === -352) {
      this.wbiKeys = null
      const fresh = await this.ensureWbiKeys(signal)
      const retryQuery = signWbi(
        { id: roomId, type: 0, web_location: 444.8 },
        fresh,
        Math.floor(this.context.clock.now() / 1000)
      )
      const retryData = await this.fetchJson(
        'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?' + retryQuery,
        signal,
        cookie
      )
      parsed = danmuInfoSchema.safeParse(retryData)
      if (!parsed.success) throw new PlatformError('protocol', 'B站返回了无法解析的弹幕服务器信息')
    }

    if (parsed.data.code === -352) {
      throw new PlatformError('rate-limited', 'B站弹幕接口仍返回 -352，请稍后重试或更换网络')
    }
    if (parsed.data.code !== 0 || parsed.data.data === undefined) {
      throw new PlatformError('auth', parsed.data.message ?? '无法获取弹幕 token')
    }
    return { token: parsed.data.data.token, host_list: parsed.data.data.host_list }
  }

  private async openSocket(
    host: string,
    port: number,
    token: string,
    roomId: number,
    signal: AbortSignal
  ): Promise<void> {
    const url = 'wss://' + host + (port === 443 ? '' : ':' + port) + '/sub'

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Origin: 'https://live.bilibili.com'
        }
      })
      this.socket = socket

      let settled = false
      const timeout = setTimeout(() => {
        fail(new PlatformError('network', '连接 B站弹幕服务器超时'))
        socket.close()
      }, API_TIMEOUT_MS)

      const cleanup = (): void => {
        clearTimeout(timeout)
      }

      const fail = (error: PlatformError): void => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }

      socket.on('open', () => {
        if (signal.aborted) {
          socket.close()
          return
        }
        socket.send(encodePacket(OP_AUTH, authBody(roomId, token, this.buvid)))
      })

      socket.on('message', (raw) => {
        let buffer: Buffer
        try {
          buffer = toBuffer(raw)
        } catch {
          return
        }

        for (const packet of decodePackets(buffer)) {
          if (packet.operation === OP_AUTH_REPLY) {
            const reply = readJson(packet.body)
            const code = readCode(reply)
            if (code !== 0) {
              fail(new PlatformError('auth', 'B站弹幕认证失败（code ' + String(code) + '）'))
              socket.close()
              return
            }
            if (!settled) {
              settled = true
              cleanup()
              this.startHeartbeat(socket)
              resolve()
            }
          } else if (packet.operation === OP_MESSAGE) {
            this.handleMessage(packet.body)
          }
        }
      })

      socket.on('error', (error) => {
        if (!settled) {
          fail(new PlatformError('network', 'B站弹幕连接失败：' + error.message))
        } else {
          this.context.logger.warn('bilibili', '弹幕连接异常', error.message)
        }
      })

      socket.on('close', () => {
        this.clearHeartbeat()
        if (this.socket === socket) this.socket = null
        if (!settled) {
          fail(new PlatformError('network', 'B站弹幕连接被关闭'))
          return
        }
        if (!this.disposed) this.scheduleReconnect()
      })
    })
  }

  private handleMessage(body: string): void {
    const payload = readJson(body)
    if (payload === null) return
    const receivedAt = this.context.clock.now()

    const chat = readChat(payload, this.activeRoomId, receivedAt)
    if (chat !== null) {
      this.context.emit({ type: 'chat', message: chat })
      return
    }

    const gift = readGift(payload, this.activeRoomId, receivedAt)
    if (gift !== null) {
      this.context.emit({ type: 'gift', gift })
      return
    }

    const member = readMember(payload, this.activeRoomId, receivedAt)
    if (member !== null) {
      this.context.emit({ type: 'member', member })
    }
  }

  private startHeartbeat(socket: WebSocket): void {
    this.clearHeartbeat()
    this.heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(encodePacket(OP_HEARTBEAT, Buffer.alloc(0)))
      }
    }, HEARTBEAT_MS)
  }

  private scheduleReconnect(): void {
    if (this.disposed) return
    this.attempt += 1
    const backoff = Math.min(30_000, 1_000 * 2 ** (this.attempt - 1))
    const delay = Math.round(backoff * (0.8 + Math.random() * 0.4))
    this.setStatus({
      phase: 'reconnecting',
      detail: '第 ' + this.attempt + ' 次重连，约 ' + Math.ceil(delay / 1000) + ' 秒后'
    })
    this.reconnectTimer = setTimeout(() => {
      void this.reconnect()
    }, delay)
  }

  private async reconnect(): Promise<void> {
    if (this.disposed || this.signal === null) return
    try {
      const room = await this.start(this.signal)
      this.attempt = 0
      this.setStatus({
        phase: 'connected',
        detail: describeRoom(room),
        connectedAt: this.context.clock.now()
      })
    } catch (error) {
      this.context.logger.warn('bilibili', '重连失败', String(error))
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

  private async fetchJson(
    url: string,
    signal: AbortSignal,
    cookie: string,
    referer = 'https://live.bilibili.com/'
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cache-Control': 'no-cache',
      Referer: referer,
      Origin: 'https://live.bilibili.com'
    }
    if (cookie.length > 0) headers.Cookie = cookie

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.any([signal, AbortSignal.timeout(API_TIMEOUT_MS)])
        })
        if (response.ok) return (await response.json()) as unknown

        const error = new PlatformError('network', 'B站接口返回 HTTP ' + String(response.status))
        if (response.status < 500 || attempt === 3) throw error
        lastError = error
      } catch (error) {
        if (signal.aborted) throw new PlatformError('network', '连接已取消')
        if (error instanceof PlatformError && !error.message.includes('HTTP 5')) throw error
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt === 3) break
      }

      await delay(250 * attempt)
    }

    const cause = fetchCause(lastError)
    throw new PlatformError('network', 'B站接口请求失败' + (cause.length > 0 ? '：' + cause : ''))
  }
}

function readCode(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const code = (value as Record<string, unknown>).code
  return typeof code === 'number' ? code : undefined
}

function toBuffer(raw: WebSocket.RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw
  if (Array.isArray(raw)) return Buffer.concat(raw)
  return Buffer.from(raw)
}

/** 允许直接粘贴直播间 URL 或“房间号 6”这类文本。 */
function normalizeRoomInput(value: string): string {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/(\d{1,12})/)
  return match?.[1] ?? trimmed
}

function uniqueHosts(
  hosts: readonly { host: string; port?: number | undefined; wss_port?: number | undefined }[]
): readonly { host: string; port?: number | undefined; wss_port?: number | undefined }[] {
  const seen = new Set<string>()
  const result: { host: string; port?: number | undefined; wss_port?: number | undefined }[] = []
  for (const item of hosts) {
    const key = item.host + ':' + String(item.wss_port ?? item.port ?? 443)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
    if (result.length >= 4) break
  }
  return result
}

function describeRoom(room: RoomInfo): string {
  const live =
    room.liveStatus === 1 ? '直播中' : room.liveStatus === 2 ? '轮播/录播' : '未开播'
  return '房间 ' + String(room.roomId) + ' · ' + live
}

function fetchCause(error: Error | null): string {
  if (error === null) return ''
  const cause = (error as Error & { cause?: unknown }).cause
  if (cause instanceof Error && cause.message.length > 0) return cause.message
  if (typeof cause === 'object' && cause !== null) {
    const record = cause as Record<string, unknown>
    const code = record.code ?? record.errno
    if (typeof code === 'string' || typeof code === 'number') return String(code)
  }
  return error.message
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const bilibiliAdapterFactory: PlatformAdapterFactory = {
  descriptor: {
    id: 'bilibili',
    name: '哔哩哔哩',
    capabilities: ['chat.read', 'gift.read', 'member.read']
  },
  configSchema: bilibiliConfigSchema,
  create(context) {
    return new BilibiliAdapter(context)
  }
}
