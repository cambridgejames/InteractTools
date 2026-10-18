import type { AppConfig } from '@contracts/config'
import type { CommandHintSource } from '@contracts/command-hint'
import type { Logger } from '@contracts/log'
import type {
  PlatformAdapter,
  PlatformAdapterFactory,
  PlatformEvent,
  PlatformId,
  PlatformStatus
} from '@contracts/platform'
import { isChatInjectable } from '@contracts/platform'
import type { Clock } from '@contracts/time'
import type { PlatformView } from '@contracts/view'

interface Connection {
  readonly adapter: PlatformAdapter
  readonly abort: AbortController
}

interface PlatformHostOptions {
  readonly factories: readonly PlatformAdapterFactory[]
  readonly clock: Clock
  readonly logger: Logger
  readonly hints: CommandHintSource
  readonly getConfig: () => AppConfig
  readonly onChange: () => void
  readonly onEvent: (event: PlatformEvent) => void
}

/**
 * 管理适配器实例与连接状态。
 *
 * 每个平台同一时刻最多一个连接；重连由适配器内部完成，Host 只负责
 * 创建、取消和状态展示。
 */
export class PlatformHost {
  private readonly factories = new Map<PlatformId, PlatformAdapterFactory>()
  private readonly connections = new Map<PlatformId, Connection>()
  private readonly statuses = new Map<PlatformId, PlatformStatus>()

  constructor(private readonly options: PlatformHostOptions) {
    for (const factory of options.factories) {
      this.factories.set(factory.descriptor.id, factory)
      this.statuses.set(factory.descriptor.id, { phase: 'disconnected' })
    }
  }

  list(): readonly PlatformView[] {
    const config = this.options.getConfig()

    return [...this.factories.values()].map((factory) => ({
      descriptor: factory.descriptor,
      status: this.status(factory.descriptor.id),
      config: config.platforms[factory.descriptor.id]
    }))
  }

  status(id: PlatformId): PlatformStatus {
    return this.statuses.get(id) ?? { phase: 'disconnected' }
  }

  async connect(id: PlatformId): Promise<void> {
    const factory = this.factories.get(id)
    if (factory === undefined) throw new Error('未知平台：' + id)
    if (this.connections.has(id)) return

    const abort = new AbortController()
    const adapter = factory.create({
      clock: this.options.clock,
      logger: this.options.logger,
      hints: this.options.hints,
      emit: (event) => this.handleEvent(id, event)
    })
    this.connections.set(id, { adapter, abort })
    this.setStatus(id, { phase: 'connecting' })

    try {
      await adapter.connect(this.options.getConfig().platforms[id], abort.signal)
      if (!abort.signal.aborted) {
        this.setStatus(id, {
          phase: 'connected',
          connectedAt: this.options.clock.now()
        })
      }
    } catch (error) {
      this.connections.delete(id)
      abort.abort()
      this.setStatus(id, {
        phase: 'error',
        detail: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async disconnect(id: PlatformId): Promise<void> {
    const connection = this.connections.get(id)
    if (connection === undefined) {
      this.setStatus(id, { phase: 'disconnected' })
      return
    }

    this.connections.delete(id)
    connection.abort.abort()
    try {
      await connection.adapter.disconnect()
    } finally {
      this.setStatus(id, { phase: 'disconnected' })
    }
  }

  async reconnect(id: PlatformId): Promise<void> {
    await this.disconnect(id)
    await this.connect(id)
  }

  injectChat(platform: PlatformId, input: { readonly userName: string; readonly text: string }): boolean {
    const adapter = this.connections.get(platform)?.adapter
    if (adapter === undefined || !isChatInjectable(adapter)) return false
    adapter.injectChat(input)
    return true
  }

  async shutdown(): Promise<void> {
    for (const id of this.connections.keys()) {
      await this.disconnect(id)
    }
  }

  private handleEvent(id: PlatformId, event: PlatformEvent): void {
    if (event.type === 'status') {
      this.setStatus(id, event.status)
      return
    }
    this.options.onEvent(event)
  }

  private setStatus(id: PlatformId, status: PlatformStatus): void {
    this.statuses.set(id, status)
    this.options.onChange()
  }
}
