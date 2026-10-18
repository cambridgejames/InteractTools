import type { ChatMessage } from './platform'
import type { Presentation } from './presentation'
import type { ToolView } from './view'
import type { Clock, RandomSource, TimerScope } from './time'
import type { Logger } from './log'
import type { ToolHistory } from './history'

export type ToolId = string

export interface ToolManifest {
  readonly id: ToolId
  readonly name: string
  readonly description: string
  readonly version: string
  /** AppIcon 的图标名；未知值由 UI 回退到通用工具图标。 */
  readonly icon: string
  /** 供 UI 展示与冲突检查；无弹幕命令的工具留空数组。 */
  readonly commands: readonly string[]
}

export interface ToolAction {
  readonly type: string
  readonly payload?: unknown
}

export interface ToolContext {
  readonly clock: Clock
  readonly timer: TimerScope
  readonly random: RandomSource
  readonly logger: Logger
  readonly history: ToolHistory
  /** 把结果交给当前呈现介质；工具不关心它是 Electron 窗口还是别的 Surface。 */
  readonly present: (presentation: Presentation) => Promise<void>
  /** 工具内部状态变化后调用，由 Engine 合并广播快照。 */
  readonly notifyChange: () => void
  /** 往直播事件流里追加一条系统提示。 */
  readonly announce: (text: string) => void
}

export interface InteractionTool {
  readonly manifest: ToolManifest

  /** config 来自持久化配置，工具内部用 zod 解析并持有强类型副本。 */
  activate(context: ToolContext, config: unknown): Promise<void>
  updateConfig(config: unknown): Promise<void>
  deactivate(): Promise<void>

  /** 消费了返回 true；未命中返回 false，交给下一个工具。 */
  handleChat(message: ChatMessage): Promise<boolean>
  handleAction(action: ToolAction): Promise<void>

  /** 必须是可结构化克隆的只读快照。 */
  view(): ToolView
}
