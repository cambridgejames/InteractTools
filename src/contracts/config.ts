import { z } from 'zod'
import { DEFAULT_DICE_CONFIG, diceConfigSchema, type DiceConfig } from './dice'
import { DEFAULT_WHEEL_CONFIG, wheelConfigSchema } from './wheel'

export const bilibiliConfigSchema = z
  .object({
    enabled: z.boolean(),
    roomId: z.string().trim().max(32)
  })
  .strict()

export type BilibiliConfig = z.infer<typeof bilibiliConfigSchema>

export const mockConfigSchema = z
  .object({
    enabled: z.boolean(),
    botsEnabled: z.boolean(),
    botsIntervalSeconds: z.number().min(1).max(60),
    botNames: z.array(z.string().trim().min(1).max(24)).min(1).max(50)
  })
  .strict()

export type MockConfig = z.infer<typeof mockConfigSchema>

export const overlayConfigSchema = z
  .object({
    alwaysOnTop: z.boolean()
  })
  .strict()

export type OverlayConfig = z.infer<typeof overlayConfigSchema>

export const appConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    platforms: z.object({
      bilibili: bilibiliConfigSchema,
      mock: mockConfigSchema
    }),
    tools: z.object({
      dice: diceConfigSchema,
      wheel: wheelConfigSchema
    }),
    overlay: overlayConfigSchema
  })
  .strict()

export type AppConfig = z.infer<typeof appConfigSchema>

export const DEFAULT_APP_CONFIG: AppConfig = {
  schemaVersion: 1,
  platforms: {
    bilibili: { enabled: false, roomId: '' },
    mock: {
      enabled: true,
      botsEnabled: true,
      botsIntervalSeconds: 3,
      botNames: ['小满', '阿七', '团子', '空格', '汽水', '晚风', '白露', '十一']
    }
  },
  tools: {
    dice: {
      ...DEFAULT_DICE_CONFIG,
      commandAliases: [...DEFAULT_DICE_CONFIG.commandAliases]
    },
    wheel: {
      ...DEFAULT_WHEEL_CONFIG,
      segments: [...DEFAULT_WHEEL_CONFIG.segments]
    }
  },
  overlay: {
    alwaysOnTop: true
  }
}

export function diceConfigFrom(config: AppConfig): DiceConfig {
  return config.tools.dice
}
