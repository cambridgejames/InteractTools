import { afterEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { LocalDouyinSigner } from '../src/platforms/douyin/signer'

const room = process.env.LIVE_DOUYIN_ROOM
const controller = new AbortController()

afterEach(() => controller.abort())

describe.skipIf(room === undefined)('Douyin local signer integration', () => {
  it('obtains a signed WSS URL and opens it', async () => {
    const signer = new LocalDouyinSigner(null)
    const signed = await signer.sign(room ?? '', controller.signal)
    expect(signed.wssUrl).toContain('signature=')
    expect(signed.roomId).toMatch(/^\d+$/)

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(signed.wssUrl, { headers: signed.headers })
      const timeout = setTimeout(() => {
        socket.close()
        reject(new Error('Douyin WSS open timeout'))
      }, 20_000)
      socket.once('open', () => {
        clearTimeout(timeout)
        socket.close()
        resolve()
      })
      socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }, 45_000)
})
