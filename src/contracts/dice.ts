import { z } from 'zod'

export const DICE_FACES = [4, 6, 8, 10, 12, 20] as const
export type DiceFaces = (typeof DICE_FACES)[number]

export const AGGREGATIONS = ['median', 'mean', 'trimmedMean'] as const
export type Aggregation = (typeof AGGREGATIONS)[number]

/** 一名观众在当前轮次里的有效力度指令。 */
export interface PowerVote {
  readonly userKey: string
  readonly userName: string
  readonly power: number
  readonly receivedAt: number
}

export interface PowerSummary {
  readonly count: number
  readonly min: number
  readonly max: number
  readonly mean: number
  readonly median: number
  readonly trimmedMean: number
  /** 按当前 aggregation 选出的代表值。 */
  readonly value: number
  readonly method: Aggregation
  /** 无人参与时为 true，value 取 fallbackPower。 */
  readonly fallback: boolean
}

export interface DiceResult {
  readonly rollId: string
  readonly faces: DiceFaces
  readonly value: number
  readonly power: number
  readonly seed: number
  readonly settled: boolean
  readonly at: number
  readonly summary: PowerSummary
}

export interface DiceConfig {
  readonly faces: DiceFaces
  readonly countdownSeconds: number
  readonly aggregation: Aggregation
  readonly fallbackPower: number
  readonly commandAliases: readonly string[]
  /** @deprecated 保留字段兼容旧配置；直接投掷现在始终可用，力度随机。 */
  readonly directRoll: boolean
}

export const powerSummarySchema = z
  .object({
    count: z.number().int().min(0),
    min: z.number(),
    max: z.number(),
    mean: z.number(),
    median: z.number(),
    trimmedMean: z.number(),
    value: z.number(),
    method: z.enum(AGGREGATIONS),
    fallback: z.boolean()
  })
  .strict()

export const diceResultSchema = z
  .object({
    rollId: z.string(),
    faces: z.union([
      z.literal(4),
      z.literal(6),
      z.literal(8),
      z.literal(10),
      z.literal(12),
      z.literal(20)
    ]),
    value: z.number().int(),
    power: z.number(),
    seed: z.number().int(),
    settled: z.boolean(),
    at: z.number(),
    summary: powerSummarySchema
  })
  .strict()

export const diceConfigSchema = z
  .object({
    faces: z.union([
      z.literal(4),
      z.literal(6),
      z.literal(8),
      z.literal(10),
      z.literal(12),
      z.literal(20)
    ]),
    countdownSeconds: z.number().int().min(5).max(600),
    aggregation: z.enum(AGGREGATIONS),
    fallbackPower: z.number().int().min(0).max(100),
    commandAliases: z.array(z.string().trim().min(1).max(16)).min(1).max(8),
    directRoll: z.boolean()
  })

export const DEFAULT_DICE_CONFIG: DiceConfig = {
  faces: 6,
  countdownSeconds: 30,
  aggregation: 'median',
  fallbackPower: 50,
  commandAliases: ['力度', 'power'],
  directRoll: true
}
