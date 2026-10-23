import { describe, expect, it } from 'vitest'
import { DEFAULT_WHEEL_CONFIG, type WheelConfig } from '@contracts/wheel'
import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import type { ChatMessage } from '@contracts/platform'
import type { Presentation } from '@contracts/presentation'
import type { Cancellable, Clock, RandomSource, TimerScope } from '@contracts/time'
import type { ToolContext } from '@contracts/tool'
import { WheelTool } from '@tools/wheel/tool'

class FakeClock implements Clock {
  value = 5_000
  now(): number {
    return this.value
  }
  advance(ms: number): void {
    this.value += ms
  }
}

class FakeTimers implements TimerScope {
  private readonly tasks: Array<{
    due: number
    readonly callback: () => void
    readonly interval: number | null
    cancelled: boolean
  }> = []

  constructor(private readonly clock: FakeClock) {}

  setTimeout(delayMs: number, callback: () => void): Cancellable {
    const task = { due: this.clock.now() + delayMs, callback, interval: null, cancelled: false }
    this.tasks.push(task)
    return { cancel: () => { task.cancelled = true } }
  }

  setInterval(intervalMs: number, callback: () => void): Cancellable {
    const task = { due: this.clock.now() + intervalMs, callback, interval: intervalMs, cancelled: false }
    this.tasks.push(task)
    return { cancel: () => { task.cancelled = true } }
  }

  async advance(ms: number): Promise<void> {
    const target = this.clock.now() + ms
    let guard = 0
    while (guard++ < 20) {
      const next = this.tasks
        .filter((task) => !task.cancelled && task.due <= target)
        .sort((left, right) => left.due - right.due)[0]
      if (next === undefined) break
      this.clock.value = next.due
      if (next.interval === null) next.cancelled = true
      else next.due += next.interval
      next.callback()
      await Promise.resolve()
    }
    this.clock.value = target
    await Promise.resolve()
  }

  clearAll(): void {
    for (const task of this.tasks) task.cancelled = true
  }
}

class MemoryHistory implements ToolHistory {
  entries: unknown[] = []
  async load(): Promise<readonly unknown[]> {
    return [...this.entries]
  }
  async append(entry: unknown): Promise<void> {
    this.entries.unshift(entry)
  }
  async clear(): Promise<void> {
    this.entries = []
  }
}

const logger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
}

describe('WheelTool', () => {
  it('spins manually without consuming chat and persists the result', async () => {
    const clock = new FakeClock()
    const timers = new FakeTimers(clock)
    const history = new MemoryHistory()
    const presentations: Presentation[] = []
    const random: RandomSource = { next: () => 0.34 }
    const announcements: string[] = []

    const context: ToolContext = {
      clock,
      timer: timers,
      random,
      logger,
      history,
      present: async (presentation) => {
        presentations.push(presentation)
      },
      notifyChange: () => undefined,
      announce: (text) => announcements.push(text),
      publishCommandHint: () => undefined
    }

    const tool = new WheelTool()
    const config: WheelConfig = { ...DEFAULT_WHEEL_CONFIG, segments: ['A', 'B', 'C', 'D'] }
    await tool.activate(context, config)

    const message: ChatMessage = {
      id: '1',
      platform: 'mock',
      roomId: 'local',
      userId: 'u1',
      userName: '观众',
      text: '!力度 80',
      receivedAt: clock.now()
    }
    expect(await tool.handleChat(message)).toBe(false)

    await tool.handleAction({ type: 'spin' })
    expect(presentations).toHaveLength(1)
    expect(presentations[0]?.kind).toBe('dismiss')

    const spinning = tool.view()
    if (spinning.toolId !== 'wheel') throw new Error('expected wheel view')
    expect(spinning.phase).toBe('spinning')
    expect(spinning.currentSpin?.resultIndex).toBe(1)
    expect(spinning.currentSpin?.stopOffset).toBeCloseTo(0.232, 3)
    expect(spinning.currentSpin?.stopEasing).toBe('glide')
    expect(spinning.currentSpin?.durationMs).toBe(5_676)

    await timers.advance(6_500)
    await new Promise((resolve) => setImmediate(resolve))

    const result = presentations.find((item) => item.kind === 'wheel.result')
    expect(result?.kind).toBe('wheel.result')
    if (result?.kind === 'wheel.result') {
      expect(result.payload.label).toBe('B')
      expect(result.payload.index).toBe(1)
      expect(result.payload.segments).toEqual(['A', 'B', 'C', 'D'])
    }

    const view = tool.view()
    expect(view.toolId).toBe('wheel')
    if (view.toolId !== 'wheel') throw new Error('expected wheel view')
    expect(view.phase).toBe('result')
    expect(view.lastResult?.label).toBe('B')
    expect(view.history).toHaveLength(1)
    expect(history.entries).toHaveLength(1)
    expect(announcements.some((item) => item.includes('B'))).toBe(true)

    await tool.deactivate()
  })
})
