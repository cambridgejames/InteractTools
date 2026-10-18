import { describe, expect, it } from 'vitest'
import { DEFAULT_DICE_CONFIG, type DiceConfig } from '@contracts/dice'
import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import type { ChatMessage } from '@contracts/platform'
import type { Presentation } from '@contracts/presentation'
import type { Cancellable, Clock, RandomSource, TimerScope } from '@contracts/time'
import type { InteractionTool, ToolContext } from '@contracts/tool'
import { DiceTool } from '@tools/dice/tool'

class FakeClock implements Clock {
  value = 1_000

  now(): number {
    return this.value
  }

  advance(ms: number): void {
    this.value += ms
  }
}

interface TimerTask {
  due: number
  readonly callback: () => void
  readonly interval: number | null
  cancelled: boolean
}

class FakeTimerScope implements TimerScope {
  private readonly tasks: TimerTask[] = []

  constructor(private readonly clock: FakeClock) {}

  setTimeout(delayMs: number, callback: () => void): Cancellable {
    const task: TimerTask = {
      due: this.clock.now() + delayMs,
      callback,
      interval: null,
      cancelled: false
    }
    this.tasks.push(task)
    return { cancel: () => { task.cancelled = true } }
  }

  setInterval(intervalMs: number, callback: () => void): Cancellable {
    const task: TimerTask = {
      due: this.clock.now() + intervalMs,
      callback,
      interval: intervalMs,
      cancelled: false
    }
    this.tasks.push(task)
    return { cancel: () => { task.cancelled = true } }
  }

  async advance(ms: number): Promise<void> {
    const target = this.clock.now() + ms
    let guard = 0

    while (guard++ < 1000) {
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

const random: RandomSource = { next: () => 0.42 }

function chat(userId: string, userName: string, text: string, at: number): ChatMessage {
  return {
    id: 'msg-' + userId + '-' + at,
    platform: 'mock',
    roomId: 'local',
    userId,
    userName,
    text,
    receivedAt: at
  }
}

describe('DiceTool', () => {
  it('collects, dedupes, rolls and persists a result', async () => {
    const clock = new FakeClock()
    const timers = new FakeTimerScope(clock)
    const history = new MemoryHistory()
    const presentations: Presentation[] = []
    const announcements: string[] = []
    const hints: (readonly string[] | null)[] = []

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
      publishCommandHint: (samples) => hints.push(samples)
    }

    const tool: InteractionTool = new DiceTool()
    const config: DiceConfig = { ...DEFAULT_DICE_CONFIG, countdownSeconds: 5 }
    await tool.activate(context, config)
    await tool.handleAction({ type: 'start' })
    expect(hints.at(-1)).toContain('!力度 30')

    await tool.handleChat(chat('a', '小满', '!力度 20', clock.now()))
    await tool.handleChat(chat('b', '阿七', '!力度 80', clock.now()))
    await tool.handleChat(chat('a', '小满', '!力度 90', clock.now()))
    await tool.handleChat(chat('c', '团子', '!力度 999', clock.now()))

    const collecting = tool.view()
    expect(collecting.toolId).toBe('dice')
    if (collecting.toolId !== 'dice') throw new Error('expected dice view')
    expect(collecting.phase).toBe('collecting')
    expect(collecting.participants).toHaveLength(2)
    expect(collecting.participants.find((person) => person.userKey === 'mock:a')?.power).toBe(90)

    await timers.advance(5_000)
    await new Promise((resolve) => setImmediate(resolve))
    expect(hints.at(-1)).toBeNull()

    const presentation = presentations.find((item) => item.kind === 'dice.roll')
    expect(presentation?.kind).toBe('dice.roll')
    if (presentation?.kind === 'dice.roll') {
      expect(presentation.payload.stats.count).toBe(2)
      expect(presentation.payload.stats.value).toBe(85)
      expect(presentation.payload.frames.length).toBeGreaterThan(10)
    }

    await timers.advance(9_000)
    await new Promise((resolve) => setImmediate(resolve))

    const result = tool.view()
    expect(result.phase).toBe('result')
    expect(result.lastResult).not.toBeNull()
    const popup = presentations.find((item) => item.kind === 'dice.result')
    expect(popup?.kind).toBe('dice.result')
    if (popup?.kind === 'dice.result' && result.toolId === 'dice' && result.lastResult !== null) {
      expect(popup.payload.value).toBe(result.lastResult.value)
      expect(popup.payload.stats.count).toBe(2)
    }
    expect(result.history).toHaveLength(1)
    expect(history.entries).toHaveLength(1)
    expect(announcements.some((item) => item.includes('开始投掷'))).toBe(true)

    await tool.updateConfig({ ...config, directRoll: true })
    await tool.handleAction({ type: 'direct' })
    const direct = tool.view()
    if (direct.toolId !== 'dice') throw new Error('expected dice view')
    expect(direct.phase).toBe('rolling')
    expect(direct.summary?.fallback).toBe(true)
    expect(direct.summary?.value).toBe(config.fallbackPower)

    await timers.advance(9_000)
    await new Promise((resolve) => setImmediate(resolve))
    const afterDirect = tool.view()
    expect(afterDirect.phase).toBe('result')
    expect(afterDirect.history).toHaveLength(2)

    await tool.deactivate()
  })
})
