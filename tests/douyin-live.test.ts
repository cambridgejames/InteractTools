import { afterEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { LocalDouyinSigner } from '../src/platforms/douyin/signer'
import { decodeDouyinFrame, encodeDouyinAck } from '../src/platforms/douyin/protocol'

const room = process.env.LIVE_DOUYIN_ROOM
const controller = new AbortController()

afterEach(() => controller.abort())

describe.skipIf(room === undefined)('Douyin local signer integration', () => {
  it('obtains a signed WSS URL and receives a decoded message', async () => {
    const signer = new LocalDouyinSigner(null)
    const signed = await signer.sign(room ?? '', controller.signal)
    expect(signed.wssUrl).toContain('signature=')
    expect(signed.roomId).toMatch(/^\d+$/)

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(signed.wssUrl, { headers: signed.headers })
      let opened = false
      let settled = false
      const timeout = setTimeout(() => {
        socket.close()
        reject(new Error(opened ? 'Douyin WSS message timeout' : 'Douyin WSS open timeout'))
      }, 20_000)
      socket.once('open', () => {
        opened = true
      })
      socket.on('message', (data) => {
        if (settled) return
        try {
          const frame = decodeDouyinFrame(new Uint8Array(data as Buffer))
          if (frame.needAck && frame.internalExt.length > 0) {
            socket.send(encodeDouyinAck(frame.internalExt))
          }
          if (frame.messages.length > 0) {
            settled = true
            clearTimeout(timeout)
            socket.close()
            resolve()
          }
        } catch {
          // 非 PushFrame 的心跳帧直接忽略，等下一帧。
        }
      })
      socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }, 45_000)
})
