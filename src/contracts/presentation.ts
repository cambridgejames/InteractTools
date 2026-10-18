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

/** 主进程算好的骰子外形；overlay 只负责建 Three 几何，不再推导物理形状。 */
export interface DiceMesh {
  readonly vertices: readonly DiceMeshVertex[]
  readonly faces: readonly DiceMeshFace[]
}

export interface DiceRollPresentation {
  readonly toolId: 'dice'
  readonly rollId: string
  readonly faces: DiceFaces
  readonly value: number
  readonly power: number
  readonly seed: number
  readonly mesh: DiceMesh
  /** 主进程录制的逐帧位姿，overlay 只回放，不重新计算。 */
  readonly frames: readonly DiceFrame[]
  /** 相邻两帧的秒数。 */
  readonly frameSeconds: number
  readonly settled: boolean
  readonly stats: PowerSummary
  readonly autoCloseSeconds: number
}

export interface WheelSpinPresentation {
  readonly toolId: 'wheel'
  readonly spinId: string
  readonly segments: readonly string[]
  readonly resultIndex: number
  readonly resultLabel: string
  readonly durationMs: number
  readonly autoCloseSeconds: number
}

export type Presentation =
  | { readonly kind: 'dice.roll'; readonly payload: DiceRollPresentation }
  | { readonly kind: 'wheel.spin'; readonly payload: WheelSpinPresentation }
  | { readonly kind: 'dismiss'; readonly toolId: string }
