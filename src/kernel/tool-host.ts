import type { AppConfig } from '@contracts/config'
import type { CommandHintBus } from './command-hint-bus'
import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import type { Presentation } from '@contracts/presentation'
import type { Clock, RandomSource, TimerScope } from '@contracts/time'
import type { InteractionTool, ToolAction } from '@contracts/tool'
import type { ToolView } from '@contracts/view'
import type { SurfaceHost, TimerFactory } from './ports'

interface ToolHostOptions {
  readonly clock: Clock
  readonly tools: readonly InteractionTool[]
  readonly timerFactory: TimerFactory
  readonly random: RandomSource
  readonly logger: Logger
  readonly hints: CommandHintBus
  readonly historyFactory: (toolId: string) => ToolHistory
  readonly surface: SurfaceHost
  readonly notifyChange: () => void
  readonly announce: (text: string) => void
}

/** 管理工具生命周期，并给每个工具隔离的定时器与历史记录作用域。 */
export class ToolHost {
  private readonly active = new Map<string, InteractionTool>()
  private readonly scopes = new Map<string, TimerScope>()
  private readonly order: string[] = []

  constructor(private readonly options: ToolHostOptions) {}

  async activate(config: AppConfig): Promise<void> {
    for (const tool of this.options.tools) {
      const id = tool.manifest.id
      if (this.active.has(id)) throw new Error('工具 id 重复：' + id)

      const timer = this.options.timerFactory.create('tool:' + id)
      const context = {
        clock: this.options.clock,
        timer,
        random: this.options.random,
        logger: this.options.logger,
        history: this.options.historyFactory(id),
        present: (presentation: Presentation) => this.options.surface.present(presentation),
        notifyChange: this.options.notifyChange,
        announce: this.options.announce,
        publishCommandHint: (samples: readonly string[] | null) => {
          if (samples === null) this.options.hints.clear(id)
          else this.options.hints.publish({ toolId: id, samples })
        }
      }

      const toolConfig = readToolConfig(config, id)
      await tool.activate(context, toolConfig)
      this.active.set(id, tool)
      this.scopes.set(id, timer)
      this.order.push(id)
    }
  }

  tools(): readonly InteractionTool[] {
    return this.order.flatMap((id) => {
      const tool = this.active.get(id)
      return tool === undefined ? [] : [tool]
    })
  }

  get(id: string): InteractionTool | undefined {
    return this.active.get(id)
  }

  views(): readonly ToolView[] {
    return this.tools().map((tool) => tool.view())
  }

  async handleAction(id: string, action: ToolAction): Promise<void> {
    const tool = this.active.get(id)
    if (tool === undefined) throw new Error('未知工具：' + id)
    await tool.handleAction(action)
  }

  async updateConfig(id: string, config: unknown): Promise<void> {
    const tool = this.active.get(id)
    if (tool === undefined) throw new Error('未知工具：' + id)
    await tool.updateConfig(config)
  }

  async deactivateAll(): Promise<void> {
    for (const id of this.order) {
      const tool = this.active.get(id)
      try {
        await tool?.deactivate()
      } catch (error) {
        this.options.logger.error('tool-host', '停用工具失败：' + id, String(error))
      }
      this.scopes.get(id)?.clearAll()
    }
    this.active.clear()
    this.scopes.clear()
    this.order.length = 0
  }
}

function readToolConfig(config: AppConfig, id: string): unknown {
  const tools = config.tools as Readonly<Record<string, unknown>>
  return tools[id]
}
