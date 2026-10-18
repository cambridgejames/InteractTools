import { z } from 'zod'

/**
 * 弹幕投票配置。
 *
 * 选项按顺序映射 1–8；观众也可以直接打选项文字。选项不允许重复，
 * 否则按文字投票会产生歧义。
 */
const votePresetSchema = z
  .object({
    id: z.string().min(1).max(40),
    name: z.string().trim().min(1).max(20),
    question: z.string().trim().max(80),
    options: z.array(z.string().trim().min(1).max(20)).min(2).max(8),
    countdownSeconds: z.number().int().min(5).max(300),
    allowRevote: z.boolean().default(false)
  })
  .strict()

export const voteConfigSchema = z
  .object({
    question: z.string().trim().max(80),
    options: z.array(z.string().trim().min(1).max(20)).min(2).max(8),
    countdownSeconds: z.number().int().min(5).max(300),
    commandAliases: z.array(z.string().trim().min(1).max(16)).min(1).max(8),
    /** 关闭时只计第一票；开启时后投覆盖前票。 */
    allowRevote: z.boolean(),
    presets: z.array(votePresetSchema).max(12)
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.options.forEach((option, index) => {
      const key = option.toLocaleLowerCase()
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', index],
          message: '投票选项不能重复'
        })
      }
      seen.add(key)
    })
  })
  .strict()

export type VoteConfig = z.infer<typeof voteConfigSchema>

export const DEFAULT_VOTE_CONFIG: VoteConfig = {
  question: '今晚玩什么？',
  options: ['方案 A', '方案 B', '方案 C'],
  countdownSeconds: 30,
  commandAliases: ['投票', 'vote'],
  allowRevote: false,
  presets: []
}

export const voteResultSchema = z
  .object({
    id: z.string().min(1),
    question: z.string(),
    options: z.array(z.string()).min(2),
    counts: z.array(z.number().int().min(0)).min(2),
    totalVotes: z.number().int().min(0),
    winners: z.array(z.number().int().min(0)),
    at: z.number()
  })
  .strict()

export type VoteResult = z.infer<typeof voteResultSchema>
