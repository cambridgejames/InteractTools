import { z } from 'zod'

export type WheelPhase = 'idle' | 'spinning' | 'result'

export interface WheelConfig {
  readonly segments: readonly string[]
  readonly spinDurationSeconds: number
}

export interface WheelResult {
  readonly spinId: string
  readonly label: string
  readonly index: number
  readonly at: number
}

export const wheelConfigSchema = z
  .object({
    segments: z.array(z.string().trim().min(1).max(20)).min(2).max(16),
    spinDurationSeconds: z.number().min(2).max(10)
  })

export const wheelResultSchema = z
  .object({
    spinId: z.string(),
    label: z.string(),
    index: z.number().int().min(0),
    at: z.number()
  })
  .strict()

export const DEFAULT_WHEEL_CONFIG: WheelConfig = {
  segments: ['一等奖', '二等奖', '三等奖', '谢谢参与', '再来一次', '幸运奖'],
  spinDurationSeconds: 5
}
