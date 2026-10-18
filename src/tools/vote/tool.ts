import {
  DEFAULT_VOTE_CONFIG,
  voteConfigSchema,
  voteResultSchema,
  type VoteConfig,
  type VoteResult
} from '@contracts/vote'
import type { ChatMessage } from '@contracts/platform'
import type { Cancellable } from '@contracts/time'
import { toUserKey } from '@contracts/platform'
import type { InteractionTool, ToolAction, ToolContext } from '@contracts/tool'
import type { VoteToolView } from '@contracts/view'
import { parseVoteCommand, pollWinners, tallyVotes } from './domain/vote'
import { voteManifest } from './manifest'

const HISTORY_LIMIT = 20

interface Ballot {
  readonly index: number
  readonly userName: string
  readonly at: number
}

/**
 * 弹幕投票工具。
 *
 * 命令驱动：观众在倒计时内发送「投票 1」或「投票 选项文字」。默认只计
 * 第一票；开启 allowRevote 后后投覆盖前票。倒计时结束后统计并列最高票。
 */
export class VoteTool implements InteractionTool {
  readonly manifest = voteManifest

  private context: ToolContext | null = null
  private config: VoteConfig = DEFAULT_VOTE_CONFIG
  private phase: VoteToolView['phase'] = 'idle'
  private ballots = new Map<string, Ballot>()
  private countdownEndsAt: number | null = null
  private resultTimer: Cancellable | null = null
  private generation = 0
  private lastResult: VoteResult | null = null
  private history: VoteResult[] = []

  async activate(context: ToolContext, config: unknown): Promise<void> {
    this.context = context
    this.config = voteConfigSchema.parse(config ?? DEFAULT_VOTE_CONFIG)
    this.history = (await context.history.load())
      .flatMap((entry) => {
        const parsed = voteResultSchema.safeParse(entry)
        return parsed.success ? [parsed.data] : []
      })
      .slice(0, HISTORY_LIMIT)
    context.notifyChange()
  }

  async updateConfig(config: unknown): Promise<void> {
    const next = voteConfigSchema.parse(config)
    if (!sameOptions(this.config.options, next.options)) {
      if (this.phase === 'collecting') {
        await this.cancelRound()
      } else {
        this.ballots.clear()
        this.lastResult = null
        this.phase = 'idle'
        this.countdownEndsAt = null
        await this.context?.present({ kind: 'dismiss', toolId: 'vote' }).catch(() => undefined)
      }
    }
    this.config = next
    this.notify()
  }

  async deactivate(): Promise<void> {
    this.generation += 1
    this.clearTimer()
    this.phase = 'idle'
    this.ballots.clear()
    this.countdownEndsAt = null
    const context = this.context
    context?.publishCommandHint(null)
    this.context = null
    if (context !== null) {
      await context.present({ kind: 'dismiss', toolId: 'vote' }).catch(() => undefined)
    }
  }

  async handleChat(message: ChatMessage): Promise<boolean> {
    if (this.phase !== 'collecting') return false

    const parsed = parseVoteCommand(message.text, this.config.commandAliases, this.config.options)
    if (parsed.status === 'ignored') return false
    if (parsed.status === 'invalid') {
      this.context?.logger.warn('vote', '忽略非法投票', message.userName + ': ' + parsed.reason)
      return true
    }

    const userKey = toUserKey(message.platform, message.userId)
    if (!this.config.allowRevote && this.ballots.has(userKey)) return true

    this.ballots.set(userKey, {
      index: parsed.index,
      userName: message.userName,
      at: message.receivedAt
    })
    this.notify()
    return true
  }

  async handleAction(action: ToolAction): Promise<void> {
    switch (action.type) {
      case 'start':
        this.start()
        return
      case 'end':
        await this.finish(true)
        return
      case 'cancel':
        await this.cancelRound()
        return
      case 'reset':
        await this.cancelRound()
        this.lastResult = null
        this.notify()
        return
      case 'clear-history':
        await this.clearHistory()
        return
      case 'preview':
        await this.preview()
        return
      default:
        throw new Error('未知投票操作：' + action.type)
    }
  }

  view(): VoteToolView {
    const indices = [...this.ballots.values()].map((ballot) => ballot.index)
    const counts = tallyVotes(indices, this.config.options.length)
    return {
      toolId: 'vote',
      name: this.manifest.name,
      description: this.manifest.description,
      icon: this.manifest.icon,
      phase: this.phase,
      question: this.config.question,
      options: [...this.config.options],
      counts,
      totalVotes: this.ballots.size,
      countdownEndsAt: this.countdownEndsAt,
      lastResult: this.lastResult,
      history: [...this.history],
      config: {
        ...this.config,
        options: [...this.config.options],
        commandAliases: [...this.config.commandAliases]
      }
    }
  }

  private start(): void {
    if (this.phase === 'collecting') return
    const context = this.requireContext()
    const generation = ++this.generation
    this.clearTimer()
    this.ballots.clear()
    this.lastResult = null
    this.phase = 'collecting'
    const endsAt = context.clock.now() + this.config.countdownSeconds * 1000
    this.countdownEndsAt = endsAt
    context.publishCommandHint(this.commandSamples())
    void context.present({ kind: 'dismiss', toolId: 'vote' }).catch(() => undefined)
    this.notify()
    context.announce(
      '投票开始：' +
        displayQuestion(this.config.question) +
        '。发送「投票 1」或选项文字；' +
        (this.config.allowRevote ? '可以改票，后投覆盖前票。' : '每人只计第一票。')
    )
    this.resultTimer = context.timer.setTimeout(
      Math.max(0, endsAt - context.clock.now()),
      () => {
        if (generation !== this.generation) return
        void this.finish(true)
      }
    )
  }

  private async finish(persist: boolean): Promise<void> {
    if (this.phase !== 'collecting') return
    const context = this.requireContext()
    context.publishCommandHint(null)
    this.generation += 1
    this.clearTimer()
    this.phase = 'result'
    this.countdownEndsAt = null

    const indices = [...this.ballots.values()].map((ballot) => ballot.index)
    const counts = tallyVotes(indices, this.config.options.length)
    const winners = pollWinners(counts)
    const totalVotes = this.ballots.size
    const result: VoteResult = {
      id: 'vote-' + context.clock.now().toString(36) + '-' + String(totalVotes),
      question: this.config.question,
      options: [...this.config.options],
      counts,
      totalVotes,
      winners,
      at: context.clock.now()
    }

    this.lastResult = result
    if (persist) {
      this.history = [result, ...this.history].slice(0, HISTORY_LIMIT)
      void context.history.append(result).catch((error: unknown) => {
        context.logger.error('vote', '保存投票历史失败', String(error))
      })
    }

    context.announce(describeResult(result))
    void context
      .present({
        kind: 'vote.result',
        payload: {
          toolId: 'vote',
          voteId: result.id,
          question: result.question,
          options: result.options,
          counts: result.counts,
          totalVotes: result.totalVotes,
          winners: result.winners
        }
      })
      .catch((error: unknown) => context.logger.error('vote', '打开投票结果失败', String(error)))
    this.notify()
  }

  private async preview(): Promise<void> {
    if (this.phase === 'collecting') return
    const context = this.requireContext()
    const options = this.config.options
    const counts = options.map((_, index) => Math.max(0, options.length - index))
    const totalVotes = counts.reduce((sum, count) => sum + count, 0)
    const winners = pollWinners(counts)
    const result: VoteResult = {
      id: 'vote-preview-' + context.clock.now().toString(36),
      question: this.config.question,
      options: [...options],
      counts,
      totalVotes,
      winners,
      at: context.clock.now()
    }
    this.phase = 'result'
    this.countdownEndsAt = null
    this.lastResult = result
    this.notify()
    await context.present({
      kind: 'vote.result',
      payload: {
        toolId: 'vote',
        voteId: result.id,
        question: result.question,
        options: result.options,
        counts: result.counts,
        totalVotes: result.totalVotes,
        winners: result.winners
      }
    })
  }

  private async cancelRound(): Promise<void> {
    this.context?.publishCommandHint(null)
    this.generation += 1
    this.clearTimer()
    this.phase = 'idle'
    this.ballots.clear()
    this.countdownEndsAt = null
    this.lastResult = null
    this.notify()
    const context = this.context
    if (context !== null) {
      await context.present({ kind: 'dismiss', toolId: 'vote' }).catch(() => undefined)
    }
  }

  private async clearHistory(): Promise<void> {
    this.history = []
    await this.context?.history.clear()
    this.notify()
  }

  private commandSamples(): readonly string[] {
    const alias = this.config.commandAliases[0] ?? '投票'
    return this.config.options.map((_, index) => '!' + alias + ' ' + String(index + 1))
  }

  private clearTimer(): void {
    this.resultTimer?.cancel()
    this.resultTimer = null
  }

  private notify(): void {
    this.context?.notifyChange()
  }

  private requireContext(): ToolContext {
    if (this.context === null) throw new Error('投票工具尚未激活')
    return this.context
  }
}

function sameOptions(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function displayQuestion(question: string): string {
  return question.length > 0 ? question : '本轮投票'
}

function describeResult(result: VoteResult): string {
  if (result.totalVotes === 0) return '投票结束：没有有效票。'
  const max = Math.max(...result.counts)
  const labels = result.winners.map((index) => result.options[index] ?? '')
  if (result.winners.length > 1) {
    return '投票结束：' + labels.join(' / ') + ' 并列最高（' + String(max) + ' 票）。'
  }
  return '投票结束：' + (labels[0] ?? '') + ' 以 ' + String(max) + ' 票胜出。'
}
