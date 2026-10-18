import type { Aggregation, DiceConfig, DiceFaces, DiceResult, PowerSummary } from './dice'
import type { PlatformDescriptor, PlatformStatus } from './platform'
import type { WheelConfig, WheelPhase, WheelResult } from './wheel'
import type { VoteConfig, VoteResult } from './vote'

export interface PlatformView {
  readonly descriptor: PlatformDescriptor
  readonly status: PlatformStatus
  readonly config: Readonly<Record<string, unknown>>
}

export type FeedKind = 'chat' | 'gift' | 'member' | 'system'

export interface FeedItem {
  readonly id: string
  readonly kind: FeedKind
  readonly platform: 'bilibili' | 'mock' | 'system'
  readonly userName: string
  readonly text: string
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

export interface WindowView {
  readonly display: string
}

export interface EngineSnapshot {
  readonly revision: number
  readonly startedAt: number
  readonly platforms: readonly PlatformView[]
  readonly tools: readonly ToolView[]
  readonly feed: readonly FeedItem[]
  readonly overlay: OverlayView
  readonly window: WindowView
}

export type { Aggregation }
