import type { Aggregation, DiceConfig, DiceFaces, DiceResult, PowerSummary } from './dice'
import type { PlatformDescriptor, PlatformId, PlatformStatus } from './platform'
import type { WheelConfig, WheelPhase, WheelResult, WheelStopEasing } from './wheel'
import type { VoteConfig, VoteResult } from './vote'
import type { NetworkConfig } from './network'
import type { LoggingConfig, ShortcutsConfig, ToolEnablement, UiConfig, UpdatesConfig } from './config'

export interface PlatformView {
  readonly descriptor: PlatformDescriptor
  readonly status: PlatformStatus
  readonly config: Readonly<Record<string, unknown>>
}

export type FeedKind = 'chat' | 'gift' | 'member' | 'system'

export interface FeedItem {
  readonly id: string
  readonly kind: FeedKind
  readonly platform: PlatformId | 'system'
  readonly userName: string
  readonly text: string
  readonly at: number
}

/** 进场/关注等成员事件不进入消息历史，只供底部 ticker 使用。 */
export interface MemberNotice {
  readonly platform: PlatformId
  readonly userName: string
  readonly at: number
}

export interface OverlayView {
  readonly open: boolean
  readonly alwaysOnTop: boolean
}

/** 所有工具视图共有的展示字段；控制台不依赖具体工具类型。 */
export interface BaseToolView {
  readonly toolId: string
  readonly name: string
  readonly description: string
  readonly icon: string
}

export type DicePhase = 'idle' | 'collecting' | 'rolling' | 'result'

export interface DiceParticipantView {
  readonly userKey: string
  readonly userName: string
  readonly power: number
  readonly receivedAt: number
}

export interface DiceToolView extends BaseToolView {
  readonly toolId: 'dice'
  readonly phase: DicePhase
  readonly faces: DiceFaces
  readonly countdownEndsAt: number | null
  readonly participants: readonly DiceParticipantView[]
  readonly summary: PowerSummary | null
  readonly lastResult: DiceResult | null
  readonly history: readonly DiceResult[]
  readonly config: DiceConfig
}

export interface WheelSpinView {
  readonly spinId: string
  readonly resultIndex: number
  /** 落点在扇区内的归一化位置；0.5 才是正中，允许偏左/偏右。 */
  readonly stopOffset: number
  readonly stopEasing: WheelStopEasing
  readonly durationMs: number
}

export interface WheelToolView extends BaseToolView {
  readonly toolId: 'wheel'
  readonly phase: WheelPhase
  readonly segments: readonly string[]
  readonly currentSpin: WheelSpinView | null
  readonly lastResult: WheelResult | null
  readonly history: readonly WheelResult[]
  readonly config: WheelConfig
}

export type VotePhase = 'idle' | 'collecting' | 'result'

export interface VoteToolView extends BaseToolView {
  readonly toolId: 'vote'
  readonly phase: VotePhase
  readonly question: string
  readonly options: readonly string[]
  readonly counts: readonly number[]
  readonly totalVotes: number
  readonly countdownEndsAt: number | null
  readonly lastResult: VoteResult | null
  readonly history: readonly VoteResult[]
  readonly config: VoteConfig
}

export type ToolView = DiceToolView | WheelToolView | VoteToolView

export interface ToolCatalogItem {
  readonly toolId: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly commands: readonly string[]
  readonly keywords: readonly string[]
  readonly enabled: boolean
}

export interface WindowView {
  readonly display: string
}

export interface EngineSnapshot {
  readonly revision: number
  readonly startedAt: number
  readonly enabledTools: ToolEnablement
  readonly toolCatalog: readonly ToolCatalogItem[]
  readonly platforms: readonly PlatformView[]
  readonly tools: readonly ToolView[]
  readonly feed: readonly FeedItem[]
  readonly recentMembers: readonly MemberNotice[]
  readonly overlay: OverlayView
  readonly window: WindowView
  readonly network: NetworkConfig
  readonly shortcuts: ShortcutsConfig
  readonly ui: UiConfig
  readonly logging: LoggingConfig
  readonly updates: UpdatesConfig
  readonly feedMode: 'full' | 'collapsed' | 'hidden'
}

export type { Aggregation }
