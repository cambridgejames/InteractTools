import { appConfigSchema, type AppConfig, type BuiltinToolId } from '@contracts/config'
import type { EngineEvent } from '@contracts/engine'
import { PlatformError } from '@contracts/errors'
import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import type { NetworkConfig, NetworkProxyInfo } from '@contracts/network'
import type { ChatMessage, PlatformAdapterFactory, PlatformEvent, PlatformId } from '@contracts/platform'
import { err, ok, type Result } from '@contracts/result'
import type { Clock, RandomSource } from '@contracts/time'
import type { InteractionTool, ToolAction } from '@contracts/tool'
import type { EngineSnapshot, FeedItem, FeedKind } from '@contracts/view'
import { CommandBus } from './command-bus'
import { CommandHintBus } from './command-hint-bus'
import { PlatformHost } from './platform-host'
import type { ConfigStore, SurfaceHost, TimerFactory } from './ports'
import { ToolHost } from './tool-host'

export interface EngineOptions {
  readonly clock: Clock
  readonly random: RandomSource
  readonly logger: Logger
  readonly network: NetworkProxyInfo
  readonly onNetworkChange?: (config: NetworkConfig) => Promise<void>
  readonly store: ConfigStore
  readonly timerFactory: TimerFactory
  readonly historyFactory: (toolId: string) => ToolHistory
  readonly surface: SurfaceHost
  readonly platformFactories: readonly PlatformAdapterFactory[]
  readonly tools: readonly InteractionTool[]
  readonly onEvent: (event: EngineEvent) => void
}

const FEED_LIMIT = 200

/** 组合平台、工具与呈现；自身不 import Electron，也不做磁盘 I/O。 */
export class Engine {
  private config: AppConfig | null = null
  private platformHost: PlatformHost | null = null
  private toolHost: ToolHost | null = null
  private hints: CommandHintBus | null = null
  private commandBus: CommandBus | null = null
  private feed: FeedItem[] = []
  private feedSeq = 0
  private revision = 0
  private readonly startedAt: number

  constructor(private readonly options: EngineOptions) {
    this.startedAt = options.clock.now()
  }

  async start(): Promise<void> {
    const config = await this.options.store.load()
    this.config = config
    await this.options.onNetworkChange?.(config.network)
    this.hints = new CommandHintBus()

    this.platformHost = new PlatformHost({
      factories: this.options.platformFactories,
      clock: this.options.clock,
      logger: this.options.logger,
      network: this.options.network,
      hints: this.hints,
      getConfig: () => this.requireConfig(),
      onChange: () => this.publishSnapshot(),
      onEvent: (event) => this.handlePlatformEvent(event)
    })

    this.toolHost = new ToolHost({
      clock: this.options.clock,
      tools: this.options.tools,
      timerFactory: this.options.timerFactory,
      random: this.options.random,
      logger: this.options.logger,
      hints: this.hints,
      historyFactory: this.options.historyFactory,
      surface: this.options.surface,
      notifyChange: () => this.publishSnapshot(),
      announce: (text) => this.appendSystem(text)
    })

    this.commandBus = new CommandBus(() => this.requireToolHost().tools(), this.options.logger)

    await this.requireToolHost().activate(config, config.enabledTools)
    this.appendSystem('互动工坊已就绪，等待弹幕。')
    this.publishSnapshot()

    void this.autoConnect()
  }

  async shutdown(): Promise<void> {
    await this.toolHost?.deactivateAll()
    this.hints?.clearAll()
    await this.platformHost?.shutdown()
  }

  snapshot(): EngineSnapshot {
    return {
      revision: this.revision,
      startedAt: this.startedAt,
      enabledTools: this.requireConfig().enabledTools,
      toolCatalog: this.requireToolHost().catalog(this.requireConfig().enabledTools),
      platforms: this.requirePlatformHost().list(),
      tools: this.requireToolHost().views(),
      feed: [...this.feed],
      overlay: {
        open: this.options.surface.isOpen(),
        alwaysOnTop: this.requireConfig().overlay.alwaysOnTop
      },
      window: {
        display: this.requireConfig().window.display
      },
      network: this.requireConfig().network,
      shortcuts: this.requireConfig().shortcuts,
      feedMode: this.requireConfig().feed.mode
    }
  }

  /** 选择控制台窗口出现在哪块屏幕；持久化后由 main 实际移动窗口。 */
  async updateWindowDisplay(display: string): Promise<void> {
    const config = this.requireConfig()
    const next = appConfigSchema.parse({
      ...config,
      window: { display }
    })
    this.config = next
    await this.options.store.save(next)
    this.publishSnapshot()
  }

  /** 弹幕栏显示模式：完整 / 折叠成窄条 / 隐藏（主播使用自己的弹幕机）。 */
  async updateFeedMode(mode: 'full' | 'collapsed' | 'hidden'): Promise<void> {
    const config = this.requireConfig()
    const next = appConfigSchema.parse({
      ...config,
      feed: { mode }
    })
    this.config = next
    await this.options.store.save(next)
    this.publishSnapshot()
  }

  async updateShortcuts(shortcuts: AppConfig['shortcuts']): Promise<void> {
    const current = this.requireConfig()
    const next = appConfigSchema.parse({ ...current, shortcuts })
    this.config = next
    await this.options.store.save(next)
    this.publishSnapshot()
  }

  async updateNetworkConfig(patch: Partial<NetworkConfig>): Promise<void> {
    const current = this.requireConfig()
    const next = appConfigSchema.parse({
      ...current,
      network: { ...current.network, ...patch }
    })
    this.config = next
    await this.options.store.save(next)
    await this.options.onNetworkChange?.(next.network)

    if (this.requirePlatformHost().status('bilibili').phase !== 'disconnected') {
      await this.requirePlatformHost().reconnect('bilibili')
    }
    this.publishSnapshot()
  }

  async setToolEnabled(id: BuiltinToolId, enabled: boolean): Promise<void> {
    const current = this.requireConfig()
    const next = appConfigSchema.parse({
      ...current,
      enabledTools: { ...current.enabledTools, [id]: enabled }
    })
    this.config = next
    await this.options.store.save(next)
    await this.requireToolHost().updateEnabled(next, next.enabledTools)
    this.publishSnapshot()
  }

  async connectPlatform(id: PlatformId): Promise<Result<void, string>> {
    try {
      await this.requirePlatformHost().connect(id)
      return ok(undefined)
    } catch (error) {
      const message = formatError(error)
      this.options.logger.error('engine', '连接平台失败：' + id, message)
      return err(message)
    }
  }

  async disconnectPlatform(id: PlatformId): Promise<void> {
    await this.requirePlatformHost().disconnect(id)
    this.publishSnapshot()
  }

  async updatePlatformConfig(
    id: PlatformId,
    patch: Readonly<Record<string, unknown>>
  ): Promise<void> {
    const current = this.requireConfig()
    const next = appConfigSchema.parse({
      ...current,
      platforms: {
        ...current.platforms,
        [id]: { ...current.platforms[id], ...patch }
      }
    })
    this.config = next
    await this.options.store.save(next)

    const host = this.requirePlatformHost()
    if (host.status(id).phase !== 'disconnected') {
      if (patch.enabled === false) await host.disconnect(id)
      else await host.reconnect(id)
    }
    this.publishSnapshot()
  }

  async updateToolConfig(toolId: string, patch: Readonly<Record<string, unknown>>): Promise<void> {
    const current = this.requireConfig()
    const tools = { ...current.tools } as Record<string, unknown>
    const existing = tools[toolId]
    if (typeof existing !== 'object' || existing === null) {
      throw new Error('未知工具：' + toolId)
    }

    tools[toolId] = { ...existing, ...patch }
    const next = appConfigSchema.parse({ ...current, tools })
    const nextToolConfig = (next.tools as Record<string, unknown>)[toolId]

    await this.requireToolHost().updateConfig(toolId, nextToolConfig)
    this.config = next
    await this.options.store.save(next)
    this.publishSnapshot()
  }

  async toolAction(toolId: string, action: ToolAction): Promise<void> {
    await this.requireToolHost().handleAction(toolId, action)
    this.publishSnapshot()
  }

  /** 预览任意工具的呈现；具体 action 由工具自己解释。 */
  async previewTool(toolId: string): Promise<void> {
    await this.toolAction(toolId, { type: 'preview' })
  }

  async dismissOverlay(): Promise<void> {
    await this.options.surface.dismiss('dice')
    this.publishSnapshot()
  }

  async simulateChat(input: {
    readonly userName: string
    readonly text: string
  }): Promise<Result<void, string>> {
    const injected = this.requirePlatformHost().injectChat('mock', input)
    if (!injected) return err('本地模拟源未连接')
    return ok(undefined)
  }

  clearFeed(): void {
    this.feed = []
    this.publishSnapshot()
  }

  private async autoConnect(): Promise<void> {
    const config = this.requireConfig()
    for (const id of ['mock', 'bilibili', 'douyin'] as const) {
      if (!config.platforms[id].enabled) continue
      if (id === 'bilibili' && config.platforms.bilibili.roomId.length === 0) continue
      if (id === 'douyin' && config.platforms.douyin.roomId.length === 0) continue
      await this.connectPlatform(id)
    }
  }

  private handlePlatformEvent(event: PlatformEvent): void {
    switch (event.type) {
      case 'chat':
        this.handleChat(event.message)
        return
      case 'gift':
        this.appendFeed({
          kind: 'gift',
          platform: event.gift.platform,
          userName: event.gift.userName,
          text: '送出 ' + event.gift.giftName + ' x' + event.gift.count
        })
        return
      case 'member':
        this.appendFeed({
          kind: 'member',
          platform: event.member.platform,
          userName: event.member.userName,
          text: event.member.kind === 'enter' ? '进入直播间' : '关注了主播'
        })
        return
      case 'status':
        return
    }
  }

  private handleChat(message: ChatMessage): void {
    this.appendFeed({
      kind: 'chat',
      platform: message.platform,
      userName: message.userName,
      text: message.text
    })

    void this.commandBus?.dispatch(message).then((consumed) => {
      if (!consumed) return
      this.publishSnapshot()
    })
  }

  private appendSystem(text: string): void {
    this.appendFeed({ kind: 'system', platform: 'system', userName: '系统', text })
  }

  private appendFeed(input: {
    readonly kind: FeedKind
    readonly platform: FeedItem['platform']
    readonly userName: string
    readonly text: string
  }): void {
    const item: FeedItem = {
      id: 'feed-' + ++this.feedSeq,
      kind: input.kind,
      platform: input.platform,
      userName: input.userName,
      text: input.text,
      at: this.options.clock.now()
    }
    this.feed.push(item)
    this.trimFeed()
    this.options.onEvent({ type: 'feed', item })
  }

  /** 进场消息优先淘汰，避免高频进场把真实弹幕历史挤出窗口。 */
  private trimFeed(): void {
    while (this.feed.length > FEED_LIMIT) {
      const memberIndex = this.feed.findIndex((entry) => entry.kind === 'member')
      if (memberIndex >= 0) this.feed.splice(memberIndex, 1)
      else this.feed.shift()
    }
  }

  private publishSnapshot(): void {
    if (this.config === null) return
    this.revision += 1
    this.options.onEvent({ type: 'snapshot', snapshot: this.snapshot() })
  }

  private requireConfig(): AppConfig {
    if (this.config === null) throw new Error('Engine 尚未启动')
    return this.config
  }

  private requirePlatformHost(): PlatformHost {
    if (this.platformHost === null) throw new Error('Engine 尚未启动')
    return this.platformHost
  }

  private requireToolHost(): ToolHost {
    if (this.toolHost === null) throw new Error('Engine 尚未启动')
    return this.toolHost
  }
}

function formatError(error: unknown): string {
  if (error instanceof PlatformError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}
