import { describe, expect, it } from 'vitest'
import type { PlatformContext, PlatformEvent } from '@contracts/platform'
import { BilibiliAdapter } from '@platforms/bilibili/adapter'

const live = process.env.LIVE_BILIBILI === '1'

const logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
}

describe.skipIf(!live)('bilibili live connection', () => {
  it('gets a danmu token and authenticates the websocket', async () => {
    const events: PlatformEvent[] = []
    const context: PlatformContext = {
      clock: { now: () => Date.now() },
      logger,
      emit: (event) => events.push(event)
    }

    const roomId = process.env.LIVE_ROOM ?? '21144080'
    const adapter = new BilibiliAdapter(context)
    await adapter.connect({ enabled: true, roomId }, new AbortController().signal)
    expect(adapter.snapshot().phase).toBe('connected')
    console.info('[bilibili-live] status:', adapter.snapshot().detail)

    await new Promise((resolve) => setTimeout(resolve, 8_000))
    const chats = events.filter((event) => event.type === 'chat')
    console.info('[bilibili-live] events:', events.length, 'chats:', chats.length)
    if (chats[0]?.type === 'chat') console.info('[bilibili-live] sample:', chats[0].message.userName, chats[0].message.text)

    await adapter.disconnect()
    expect(adapter.snapshot().phase).toBe('disconnected')
  }, 30_000)
})
