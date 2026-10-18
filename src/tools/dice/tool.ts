import {
  DEFAULT_DICE_CONFIG,
  diceConfigSchema,
  diceResultSchema,
  type DiceConfig,
  type DiceResult,
  type PowerSummary,
  type PowerVote
} from '@contracts/dice'
import type { Cancellable } from '@contracts/time'
import { toUserKey, type ChatMessage } from '@contracts/platform'
import type { DicePhase, DiceToolView } from '@contracts/view'
import type { InteractionTool, ToolAction, ToolContext } from '@contracts/tool'
import { diceManifest } from './manifest'
import { foldVotes, fallbackSummary, summarizePower } from './domain/aggregate'
import { parsePowerCommand } from './domain/command'
import { getDiceGeometry } from './physics/geometry'
import { simulateDice } from './physics/simulate'

const HISTORY_LIMIT = 20

/**
 * 投骰子工具。
 *
 * 只负责“收集力度 → 聚合 → 调物理 → 交给呈现”，不直接碰窗口、
 * 不读写磁盘；历史记录通过 ToolContext.history 端口持久化。
 */
export class DiceTool implements InteractionTool {
  readonly manifest = diceManifest

  private context: ToolContext | null = null
  private config: DiceConfig = DEFAULT_DICE_CONFIG
  private phase: DicePhase = 'idle'
  private participants = new Map<string, PowerVote>()
  private summary: PowerSummary | null = null
  private countdownEndsAt: number | null = null
  private lastResult: DiceResult | null = null
  private history: DiceResult[] = []
  private countdown: Cancellable | null = null
  private resultTimer: Cancellable | null = null
  private generation = 0

  async activate(context: ToolContext, config: unknown): Promise<void> {
    this.context = context
    this.config = diceConfigSchema.parse(config ?? DEFAULT_DICE_CONFIG)
    this.history = (await context.history.load())
      .flatMap((entry) => {
        const parsed = diceResultSchema.safeParse(entry)
        return parsed.success ? [parsed.data] : []
      })
      .slice(0, HISTORY_LIMIT)
    context.notifyChange()
  }

  async updateConfig(config: unknown): Promise<void> {
    this.config = diceConfigSchema.parse(config)
    this.notify()
  }

  async deactivate(): Promise<void> {
    this.generation += 1
    this.clearTimers()
    this.phase = 'idle'
    this.countdownEndsAt = null
    const context = this.context
    this.context = null
    if (context !== null) {
      await context.present({ kind: 'dismiss', toolId: 'dice' }).catch(() => undefined)
    }
  }

  async handleChat(message: ChatMessage): Promise<boolean> {
    if (this.phase !== 'collecting') return false

    const parsed = parsePowerCommand(message.text, this.config.commandAliases)
    if (parsed.status === 'ignored') return false

    if (parsed.status === 'invalid') {
      this.context?.logger.warn('dice', '忽略非法力度指令', message.userName + ': ' + parsed.reason)
      return true
    }

    this.participants.set(toUserKey(message.platform, message.userId), {
      userKey: toUserKey(message.platform, message.userId),
      userName: message.userName,
      power: parsed.value,
      receivedAt: message.receivedAt
    })
    this.notify()
    return true
  }

  async handleAction(action: ToolAction): Promise<void> {
    switch (action.type) {
      case 'start':
        this.startCollection()
        return
      case 'cancel':
        await this.cancel()
        return
      case 'preview':
        await this.preview()
        return
      case 'reset':
        this.reset()
        return
      case 'clear-history':
        await this.clearHistory()
        return
      default:
        throw new Error('未知骰子操作：' + action.type)
    }
  }

  view(): DiceToolView {
    const participants = [...this.participants.values()].sort(
      (left, right) => left.receivedAt - right.receivedAt
    )

    return {
      toolId: 'dice',
      phase: this.phase,
      faces: this.config.faces,
      countdownEndsAt: this.countdownEndsAt,
      participants: participants.map((vote) => ({
        userKey: vote.userKey,
        userName: vote.userName,
        power: vote.power,
        receivedAt: vote.receivedAt
      })),
      summary: this.summary === null ? null : { ...this.summary },
      lastResult: this.lastResult,
      history: [...this.history],
      config: {
        ...this.config,
        commandAliases: [...this.config.commandAliases]
      }
    }
  }

  private startCollection(): void {
    if (this.phase === 'collecting' || this.phase === 'rolling') return
    const context = this.requireContext()

    void context.present({ kind: 'dismiss', toolId: 'dice' }).catch(() => undefined)
    this.generation += 1
    this.clearTimers()
    this.participants.clear()
    this.summary = null
    this.lastResult = null
    this.phase = 'collecting'
    this.countdownEndsAt = context.clock.now() + this.config.countdownSeconds * 1000

    context.announce(
      '开始收集力度：发送 ' + this.commandHint() + '，' + this.config.countdownSeconds + ' 秒后投掷。'
    )
    this.countdown = context.timer.setInterval(250, () => {
      const endsAt = this.countdownEndsAt
      if (endsAt === null) return
      if (context.clock.now() >= endsAt) {
        void this.finishCollection()
        return
      }
      this.notify()
    })
    this.notify()
  }

  private async finishCollection(): Promise<void> {
    if (this.phase !== 'collecting') return
    const context = this.requireContext()

    this.countdown?.cancel()
    this.countdown = null
    this.countdownEndsAt = null

    const votes = foldVotes([...this.participants.values()])
    this.summary =
      summarizePower(votes, this.config.aggregation) ??
      fallbackSummary(this.config.fallbackPower, this.config.aggregation)

    const summary = this.summary
    context.announce(
      '本轮 ' +
        summary.count +
        ' 人参与，' +
        methodLabel(summary.method) +
        ' ' +
        formatPower(summary.value) +
        '，开始投掷。'
    )
    await this.roll(summary, true)
  }

  private async preview(): Promise<void> {
    if (this.phase === 'collecting' || this.phase === 'rolling') return
    const context = this.requireContext()
    const now = context.clock.now()
    const sample = [38, 52, 61, 74, 83, 95]
    const names = ['小满', '阿七', '团子', '空格', '汽水', '晚风']
    const votes: PowerVote[] = sample.map((power, index) => ({
      userKey: 'preview:' + index,
      userName: names[index] ?? '观众',
      power,
      receivedAt: now - (sample.length - index) * 1000
    }))

    const summary = summarizePower(votes, this.config.aggregation)
    if (summary === null) return
    this.summary = summary
    this.phase = 'rolling'
    this.lastResult = null
    this.notify()
    await this.roll(summary, false)
  }

  private async roll(summary: PowerSummary, persist: boolean): Promise<void> {
    const context = this.requireContext()
    const generation = this.generation
    const seed = Math.floor(context.random.next() * 0xffffffff)
    const geometry = getDiceGeometry(this.config.faces)

    let simulation: ReturnType<typeof simulateDice>
    try {
      simulation = simulateDice({
        faces: this.config.faces,
        power: summary.value,
        seed
      })
    } catch (error) {
      context.logger.error('dice', '物理模拟失败', String(error))
      this.phase = 'idle'
      this.lastResult = null
      context.announce('投掷失败，请查看日志。')
      this.notify()
      return
    }

    const result: DiceResult = {
      rollId: 'roll-' + context.clock.now().toString(36) + '-' + seed.toString(36),
      faces: this.config.faces,
      value: simulation.value,
      power: summary.value,
      seed,
      settled: simulation.settled,
      at: context.clock.now(),
      summary
    }

    this.phase = 'rolling'
    this.lastResult = result
    this.notify()

    try {
      await context.present({
        kind: 'dice.roll',
        payload: {
          toolId: 'dice',
          rollId: result.rollId,
          faces: result.faces,
          value: result.value,
          power: result.power,
          seed: result.seed,
          mesh: {
            vertices: geometry.vertices,
            faces: geometry.polygons.map((face) => ({
              number: face.number,
              indices: face.indices
            }))
          },
          frames: simulation.frames,
          frameSeconds: simulation.frameSeconds,
          settled: result.settled,
          stats: summary,
          autoCloseSeconds: this.config.overlayAutoCloseSeconds
        }
      })
    } catch (error) {
      context.logger.error('dice', '打开结果窗口失败', String(error))
    }

    if (generation !== this.generation) return

    const playbackMs = simulation.frames.length * simulation.frameSeconds * 1000 + 300
    this.resultTimer = context.timer.setTimeout(playbackMs, () => {
      if (generation !== this.generation) return
      this.phase = 'result'
      this.lastResult = result
      if (persist) {
        this.history = [result, ...this.history].slice(0, HISTORY_LIMIT)
        void context.history.append(result).catch((error: unknown) => {
          context.logger.error('dice', '保存历史失败', String(error))
        })
      }
      context.announce('骰子停稳：' + result.value + ' 点' + (result.settled ? '' : '（未完全停稳）'))
      this.notify()
    })
  }

  private async cancel(): Promise<void> {
    const context = this.context
    this.generation += 1
    this.clearTimers()
    this.phase = 'idle'
    this.countdownEndsAt = null
    this.participants.clear()
    this.summary = null
    this.notify()
    if (context !== null) {
      await context.present({ kind: 'dismiss', toolId: 'dice' }).catch(() => undefined)
    }
  }

  private reset(): void {
    this.generation += 1
    this.clearTimers()
    this.phase = 'idle'
    this.countdownEndsAt = null
    this.participants.clear()
    this.summary = null
    this.notify()
  }

  private async clearHistory(): Promise<void> {
    this.history = []
    await this.context?.history.clear()
    this.notify()
  }

  private clearTimers(): void {
    this.countdown?.cancel()
    this.countdown = null
    this.resultTimer?.cancel()
    this.resultTimer = null
  }

  private notify(): void {
    this.context?.notifyChange()
  }

  private commandHint(): string {
    const alias = this.config.commandAliases[0] ?? '力度'
    return '!' + alias + ' 80'
  }

  private requireContext(): ToolContext {
    if (this.context === null) throw new Error('投骰子工具尚未激活')
    return this.context
  }
}

function methodLabel(method: PowerSummary['method']): string {
  switch (method) {
    case 'mean':
      return '平均力度'
    case 'median':
      return '中位力度'
    case 'trimmedMean':
      return '截尾平均力度'
  }
}

function formatPower(power: number): string {
  return Number.isInteger(power) ? String(power) : power.toFixed(1)
}
