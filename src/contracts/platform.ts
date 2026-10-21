import type { ZodType } from 'zod'
import type { Clock } from './time'
import type { Logger } from './log'
import type { CommandHintSource } from './command-hint'
import type { NetworkProxyInfo } from './network'

export type PlatformId = 'bilibili' | 'douyin' | 'mock'

export type PlatformCapability = 'chat.read' | 'gift.read' | 'member.read'

export interface PlatformDescriptor {
  readonly id: PlatformId
  readonly name: string
  readonly capabilities: readonly PlatformCapability[]
}

export interface ChatMessage {
  readonly id: string
  readonly platform: PlatformId
  readonly roomId: string
  readonly userId: string
  readonly userName: string
  readonly text: string
  /** Unix 毫秒时间戳。 */
  readonly receivedAt: number
}

export interface GiftEvent {
  readonly id: string
  readonly platform: PlatformId
  readonly roomId: string
  readonly userId: string
  readonly userName: string
  readonly giftName: string
  readonly count: number
  readonly receivedAt: number
}

export interface MemberEvent {
  readonly id: string
  readonly platform: PlatformId
  readonly roomId: string
  readonly userId: string
  readonly userName: string
  readonly kind: 'enter' | 'follow' | 'share'
  readonly receivedAt: number
}

export type PlatformPhase =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export interface PlatformStatus {
  readonly phase: PlatformPhase
  readonly detail?: string
  readonly connectedAt?: number
}

export type PlatformEvent =
  | { readonly type: 'chat'; readonly message: ChatMessage }
  | { readonly type: 'gift'; readonly gift: GiftEvent }
  | { readonly type: 'member'; readonly member: MemberEvent }
  | { readonly type: 'status'; readonly status: PlatformStatus }

export interface PlatformContext {
  readonly clock: Clock
  readonly logger: Logger
  readonly network: NetworkProxyInfo
  readonly emit: (event: PlatformEvent) => void
  /** 可选：模拟源订阅当前正在收集的工具命令。 */
  readonly hints?: CommandHintSource
}

export interface PlatformAdapter {
  readonly descriptor: PlatformDescriptor

  /** 失败必须抛 PlatformError；成功后 snapshot 必须为 connected。 */
  connect(config: unknown, signal: AbortSignal): Promise<void>
  disconnect(): Promise<void>
  snapshot(): PlatformStatus
}

export interface PlatformAdapterFactory {
  readonly descriptor: PlatformDescriptor
  readonly configSchema: ZodType
  create(context: PlatformContext): PlatformAdapter
}

/** 模拟源额外提供注入能力，供控制台手动发弹幕。 */
export interface ChatInjectable {
  injectChat(input: { readonly userName: string; readonly text: string }): void
}

export function isChatInjectable(
  adapter: PlatformAdapter
): adapter is PlatformAdapter & ChatInjectable {
  return typeof (adapter as Partial<ChatInjectable>).injectChat === 'function'
}

/** 跨平台唯一参与者键，避免同名或同 id 用户串票。 */
export function toUserKey(platform: PlatformId, userId: string): string {
  return platform + ':' + userId
}
