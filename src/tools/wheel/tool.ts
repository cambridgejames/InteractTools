import {
  DEFAULT_WHEEL_CONFIG,
  wheelConfigSchema,
  wheelResultSchema,
  type WheelConfig,
  type WheelResult
} from '@contracts/wheel'
import type { ChatMessage } from '@contracts/platform'
import type { Cancellable } from '@contracts/time'
import type { InteractionTool, ToolAction, ToolContext } from '@contracts/tool'
import type { WheelPhase } from '@contracts/wheel'
import type { WheelSpinView, WheelToolView } from '@contracts/view'
import { wheelManifest } from './manifest'

const HISTORY_LIMIT = 20

/**
 * 转转盘工具。
 *
 * 与骰子相反，它没有任何弹幕命令：主播在控制台点一下，转盘就在面板内
 * 旋转并停在主进程选中的格子上，停稳后再弹结果。这样验证工具框架不只
 * 服务“弹幕互动”一种形态。
 */
export class WheelTool implements InteractionTool {
  readonly manifest = wheelManifest

  private context: ToolContext | null = null
  private config: WheelConfig = DEFAULT_WHEEL_CONFIG
  private phase: WheelPhase = 'idle'
  private currentSpin: WheelSpinView | null = null
  private lastResult: WheelResult | null = null
  private history: WheelResult[] = []
  private resultTimer: Cancellable | null = null
  private generation = 0
  private bag: number[] = []
  private bagCount = 0

  async activate(context: ToolContext, config: unknown): Promise<void> {
    this.context = context
    this.config = wheelConfigSchema.parse(config ?? DEFAULT_WHEEL_CONFIG)
    this.history = (await context.history.load())
      .flatMap((entry) => {
        const parsed = wheelResultSchema.safeParse(entry)
        return parsed.success ? [parsed.data] : []
      })
      .slice(0, HISTORY_LIMIT)
    this.bag = []
    this.bagCount = 0
    context.notifyChange()
  }

  async updateConfig(config: unknown): Promise<void> {
    this.config = wheelConfigSchema.parse(config)
    this.bag = []
    this.bagCount = 0
    this.notify()
  }

  async deactivate(): Promise<void> {
    this.generation += 1
    this.resultTimer?.cancel()
    this.resultTimer = null
    this.phase = 'idle'
    this.currentSpin = null
    this.bag = []
    this.bagCount = 0
    const context = this.context
    this.context = null
    if (context !== null) {
      await context.present({ kind: 'dismiss', toolId: 'wheel' }).catch(() => undefined)
    }
  }

  async handleChat(_message: ChatMessage): Promise<boolean> {
    return false
  }

  async handleAction(action: ToolAction): Promise<void> {
    switch (action.type) {
      case 'spin':
        await this.spin(true)
        return
      case 'preview':
        await this.spin(false)
        return
      case 'reset':
        this.reset()
        return
      case 'clear-history':
        await this.clearHistory()
        return
      default:
        throw new Error('未知转盘操作：' + action.type)
    }
  }

  view(): WheelToolView {
    return {
      toolId: 'wheel',
      name: this.manifest.name,
      description: this.manifest.description,
      icon: this.manifest.icon,
      phase: this.phase,
      segments: [...this.config.segments],
      currentSpin: this.currentSpin === null ? null : { ...this.currentSpin },
      lastResult: this.lastResult,
      history: [...this.history],
      config: {
        ...this.config,
        segments: [...this.config.segments]
      }
    }
  }

  private async spin(persist: boolean): Promise<void> {
    if (this.phase === 'spinning') return
    const context = this.requireContext()
    const segments = this.config.segments
    if (segments.length < 2) throw new Error('转盘至少需要两个格子')

    // 持久旋转从洗牌袋抽签：每格都轮到过一次才重新洗牌，避免短期高度集中。
    const index = persist
      ? this.drawIndex(segments.length)
      : Math.min(segments.length - 1, Math.floor(context.random.next() * segments.length))
    const label = segments[index] ?? ''
    // 不再每次都停在扇区正中：0.18–0.82 的落点既保留正确结果，也能看出
    // 指针压线、擦边和最后一段滑行，避免“每次都是黑幕”的观感。
    const stopOffset = 0.5 + (context.random.next() - 0.5) * 0.64
    const stopEasing = context.random.next() < 0.5 ? 'glide' : 'brake'
    const now = context.clock.now()
    const spinId = 'wheel-' + now.toString(36) + '-' + index
    const result: WheelResult = { spinId, label, index, at: now }
    // 结果在点击瞬间就已确定；时长只服务观感，滑步更长，急停更短。
    const durationMs = stopEasing === 'glide'
      ? 5_200 + Math.round(context.random.next() * 1_400)
      : 3_600 + Math.round(context.random.next() * 900)
    const generation = ++this.generation

    this.phase = 'spinning'
    this.currentSpin = { spinId, resultIndex: index, stopOffset, stopEasing, durationMs }
    this.lastResult = result
    void context.present({ kind: 'dismiss', toolId: 'wheel' }).catch(() => undefined)
    this.notify()

    this.resultTimer = context.timer.setTimeout(
      durationMs + 350,
      () => {
        if (generation !== this.generation) return
        this.phase = 'result'
        this.lastResult = result
        if (persist) {
          this.history = [result, ...this.history].slice(0, HISTORY_LIMIT)
          void context.history.append(result).catch((error: unknown) => {
            context.logger.error('wheel', '保存转盘历史失败', String(error))
          })
        }
        context.announce('转盘停在「' + result.label + '」。')
        void context
          .present({
            kind: 'wheel.result',
            payload: {
              toolId: 'wheel',
              spinId,
              label: result.label,
              index: result.index,
              segments: [...segments]
            }
          })
          .catch((error: unknown) => context.logger.error('wheel', '打开结果弹窗失败', String(error)))
        this.notify()
      }
    )
  }

  private drawIndex(count: number): number {
    if (this.bag.length === 0 || this.bagCount !== count) {
      this.bagCount = count
      this.bag = Array.from({ length: count }, (_, index) => index)
      for (let index = this.bag.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(this.requireContext().random.next() * (index + 1))
        const value = this.bag[index]
        this.bag[index] = this.bag[swap] ?? 0
        this.bag[swap] = value ?? 0
      }
    }

    let next = this.bag.pop() ?? 0
    // 新一袋的第一签如果和上一轮相同，和袋内另一签交换，避免跨袋连击。
    if (next === this.lastResult?.index && this.bag.length > 0) {
      const swap = Math.floor(this.requireContext().random.next() * this.bag.length)
      this.bag.push(next)
      next = this.bag[swap] ?? next
      this.bag[swap] = this.bag[this.bag.length - 1] ?? 0
      this.bag.pop()
    }
    return next
  }

  private reset(): void {
    this.generation += 1
    this.resultTimer?.cancel()
    this.resultTimer = null
    this.phase = 'idle'
    this.currentSpin = null
    this.lastResult = null
    this.bag = []
    this.bagCount = 0
    this.notify()
  }

  private async clearHistory(): Promise<void> {
    this.history = []
    await this.context?.history.clear()
    this.notify()
  }

  private notify(): void {
    this.context?.notifyChange()
  }

  private requireContext(): ToolContext {
    if (this.context === null) throw new Error('转转盘工具尚未激活')
    return this.context
  }
}
