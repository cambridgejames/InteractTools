import type { Aggregation, DiceConfig, DiceFaces, DiceResult, PowerSummary } from './dice'
import type { PlatformDescriptor, PlatformStatus } from './platform'

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

export type DicePhase = 'idle' | 'collecting' | 'rolling' | 'result'

export interface DiceParticipantView {
  readonly userKey: string
  readonly userName: string
  readonly power: number
  readonly receivedAt: number
}

export interface DiceToolView {
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

export type ToolView = DiceToolView

export interface EngineSnapshot {
  readonly revision: number
  readonly startedAt: number
  readonly platforms: readonly PlatformView[]
  readonly tools: readonly ToolView[]
  readonly feed: readonly FeedItem[]
  readonly overlay: OverlayView
}

export type { Aggregation }
