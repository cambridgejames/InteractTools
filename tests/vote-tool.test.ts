import { describe, expect, it } from 'vitest'
import { DEFAULT_VOTE_CONFIG, type VoteConfig } from '@contracts/vote'
import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import type { ChatMessage } from '@contracts/platform'
import type { Presentation } from '@contracts/presentation'
import type { Cancellable, Clock, RandomSource, TimerScope } from '@contracts/time'
import type { ToolContext } from '@contracts/tool'
import { VoteTool } from '@tools/vote/tool'
import { parseVoteCommand, pollWinners } from '@tools/vote/domain/vote'

class FakeClock implements Clock {
  value = 1_000
  now(): number {
    return this.value
  }
}

class FakeTimers implements TimerScope {
  private readonly tasks: { due: number; callback: () => void; cancelled: boolean }[] = []

  constructor(private readonly clock: FakeClock) {}

  setTimeout(delayMs: number, callback: () => void): Cancellable {
    const task = { due: this.clock.now() + delayMs, callback, cancelled: false }
    this.tasks.push(task)
    return { cancel: () => { task.cancelled = true } }
  }

  setInterval(_intervalMs: number, _callback: () => void): Cancellable {
    return { cancel: () => undefined }
  }

  clearAll(): void {
    for (const task of this.tasks) task.cancelled = true
  }

  async advance(ms: number): Promise<void> {
    const target = this.clock.now() + ms
    let guard = 0
    while (guard++ < 100) {
      const next = this.tasks
        .filter((task) => !task.cancelled && task.due <= target)
        .sort((left, right) => left.due - right.due)[0]
      if (next === undefined) break
      this.clock.value = next.due
      next.cancelled = true
      next.callback()
      await Promise.resolve()
    }
    this.clock.value = target
    await Promise.resolve()
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

const random: RandomSource = { next: () => 0.5 }

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

describe('parseVoteCommand', () => {
  const options = ['方案 A', '方案 B', '方案 C']

  it('accepts index and label, with or without prefix', () => {
    expect(parseVoteCommand('!投票 2', ['投票', 'vote'], options)).toEqual({ status: 'matched', index: 1 })
    expect(parseVoteCommand('投票：方案 C', ['投票'], options)).toEqual({ status: 'matched', index: 2 })
    expect(parseVoteCommand('vote 方案 B', ['投票', 'vote'], options)).toEqual({ status: 'matched', index: 1 })
  })

  it('ignores unrelated text and rejects invalid choices', () => {
    expect(parseVoteCommand('我觉得投票 A 不错', ['投票'], options)).toEqual({ status: 'ignored' })
    expect(parseVoteCommand('投票 9', ['投票'], options).status).toBe('invalid')
    expect(parseVoteCommand('投票 不存在', ['投票'], options).status).toBe('invalid')
  })

  it('returns all tied winners or none', () => {
    expect(pollWinners([2, 2, 1])).toEqual([0, 1])
    expect(pollWinners([0, 0, 0])).toEqual([])
  })
})

describe('VoteTool', () => {
  it('collects last vote per viewer, ends on countdown and persists the result', async () => {
    const clock = new FakeClock()
    const timers = new FakeTimers(clock)
    const history = new MemoryHistory()
    const presentations: Presentation[] = []
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
      announce: (text) => announcements.push(text)
    }

    const tool = new VoteTool()
    const config: VoteConfig = {
      ...DEFAULT_VOTE_CONFIG,
      options: ['A', 'B', 'C'],
      countdownSeconds: 5,
      commandAliases: ['投票', 'vote']
    }
    await tool.activate(context, config)
    await tool.handleAction({ type: 'start' })

    expect(await tool.handleChat(chat('u1', '小满', '!投票 A', clock.now()))).toBe(true)
    expect(await tool.handleChat(chat('u2', '阿七', '投票 2', clock.now()))).toBe(true)
    expect(await tool.handleChat(chat('u1', '小满', 'vote C', clock.now()))).toBe(true)
    expect(await tool.handleChat(chat('u3', '团子', '投票 9', clock.now()))).toBe(true)
    expect(await tool.handleChat(chat('u3', '团子', '你好', clock.now()))).toBe(false)

    const collecting = tool.view()
    expect(collecting.toolId).toBe('vote')
    if (collecting.toolId !== 'vote') throw new Error('expected vote view')
    expect(collecting.phase).toBe('collecting')
    expect(collecting.totalVotes).toBe(2)
    expect(collecting.counts).toEqual([0, 1, 1])

    await timers.advance(5_000)
    await new Promise((resolve) => setImmediate(resolve))

    const result = tool.view()
    if (result.toolId !== 'vote') throw new Error('expected vote view')
    expect(result.phase).toBe('result')
    expect(result.lastResult?.winners).toEqual([1, 2])
    expect(result.lastResult?.totalVotes).toBe(2)
    expect(result.history).toHaveLength(1)
    expect(history.entries).toHaveLength(1)
    expect(announcements.some((item) => item.includes('并列最高'))).toBe(true)

    const popup = presentations.find((item) => item.kind === 'vote.result')
    expect(popup?.kind).toBe('vote.result')
    if (popup?.kind === 'vote.result') {
      expect(popup.payload.winners).toEqual([1, 2])
      expect(popup.payload.counts).toEqual([0, 1, 1])
    }

    expect(await tool.handleChat(chat('u4', '空格', '投票 A', clock.now()))).toBe(false)
    await tool.deactivate()
  })
})
