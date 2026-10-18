import type { DiceFaces, PowerSummary } from './dice'

export interface DiceFrame {
  readonly position: readonly [number, number, number]
  readonly quaternion: readonly [number, number, number, number]
}

export interface DiceMeshVertex {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface DiceMeshFace {
  readonly number: number
  readonly indices: readonly number[]
}

/** 主进程算好的骰子外形；DicePanel 只负责建 Three 几何。 */
export interface DiceMesh {
  readonly vertices: readonly DiceMeshVertex[]
  readonly faces: readonly DiceMeshFace[]
}

/** 投掷动画：发到工具面板，在面板内就地播放。 */
export interface DiceRollPresentation {
  readonly toolId: 'dice'
  readonly rollId: string
  readonly faces: DiceFaces
  readonly value: number
  readonly power: number
  readonly seed: number
  readonly mesh: DiceMesh
  readonly frames: readonly DiceFrame[]
  readonly frameSeconds: number
  readonly settled: boolean
  readonly stats: PowerSummary
}

/** 骰子结果弹窗：动画结束后才出现。 */
export interface DiceResultPresentation {
  readonly toolId: 'dice'
  readonly rollId: string
  readonly faces: DiceFaces
  readonly value: number
  readonly power: number
  readonly settled: boolean
  readonly stats: PowerSummary
}

/** 转盘结果弹窗：转盘在控制面板内转完后才出现。 */
export interface WheelResultPresentation {
  readonly toolId: 'wheel'
  readonly spinId: string
  readonly label: string
  readonly index: number
  readonly segments: readonly string[]
}

export interface VoteResultPresentation {
  readonly toolId: 'vote'
  readonly voteId: string
  readonly question: string
  readonly options: readonly string[]
  readonly counts: readonly number[]
  readonly totalVotes: number
  readonly winners: readonly number[]
}

export type Presentation =
  | { readonly kind: 'dice.roll'; readonly payload: DiceRollPresentation }
  | { readonly kind: 'dice.result'; readonly payload: DiceResultPresentation }
  | { readonly kind: 'wheel.result'; readonly payload: WheelResultPresentation }
  | { readonly kind: 'vote.result'; readonly payload: VoteResultPresentation }
  | { readonly kind: 'dismiss'; readonly toolId: string }
