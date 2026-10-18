import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformEvent } from '@contracts/platform'
import { CommandHintBus } from '@kernel/command-hint-bus'
import { MockAdapter } from '@platforms/mock'

const logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MockAdapter command hints', () => {
  it('only injects the collecting tool command when a hint is published', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const hints = new CommandHintBus()
    const events: PlatformEvent[] = []
    const adapter = new MockAdapter({
      clock: { now: () => 1_000 },
      logger,
      hints,
      emit: (event) => events.push(event)
    })

    await adapter.connect(
      {
        enabled: true,
        botsEnabled: true,
        botsIntervalSeconds: 1,
        botNames: ['小满']
      },
      new AbortController().signal
    )

    await vi.advanceTimersByTimeAsync(1_000)
    const normal = events.filter((event) => event.type === 'chat')
    expect(normal).toHaveLength(1)
    if (normal[0]?.type === 'chat') expect(normal[0].message.text.startsWith('!')).toBe(false)

    hints.publish({ toolId: 'vote', samples: ['!投票 2'] })
    await vi.advanceTimersByTimeAsync(1_000)
    const commands = events.filter((event) => event.type === 'chat')
    const command = commands.at(-1)
    expect(command?.type).toBe('chat')
    if (command?.type === 'chat') expect(command.message.text).toBe('!投票 2')

    hints.clear('vote')
    await vi.advanceTimersByTimeAsync(1_000)
    const after = events.filter((event) => event.type === 'chat').at(-1)
    if (after?.type === 'chat') expect(after.message.text.startsWith('!')).toBe(false)

    await adapter.disconnect()
  })
})
