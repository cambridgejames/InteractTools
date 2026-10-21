import { z } from 'zod'
import { DEFAULT_DICE_CONFIG, diceConfigSchema, type DiceConfig } from './dice'
import { DEFAULT_WHEEL_CONFIG, wheelConfigSchema } from './wheel'
import { DEFAULT_VOTE_CONFIG, voteConfigSchema } from './vote'
import { DEFAULT_NETWORK_CONFIG, networkConfigSchema } from './network'

export const TOOL_IDS = ['dice', 'wheel', 'vote'] as const
export type BuiltinToolId = (typeof TOOL_IDS)[number]

export const toolEnablementSchema = z
  .object({
    dice: z.boolean(),
    wheel: z.boolean(),
    vote: z.boolean()
  })
  .strict()

export type ToolEnablement = z.infer<typeof toolEnablementSchema>

export const DEFAULT_TOOL_ENABLEMENT: ToolEnablement = {
  dice: true,
  wheel: true,
  vote: true
}

export const bilibiliConfigSchema = z
  .object({
    enabled: z.boolean(),
    roomId: z.string().trim().max(256)
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

export const windowConfigSchema = z
  .object({
    /** 'cursor' | 'primary' | Electron Display.id（字符串）。 */
    display: z.string().trim().min(1).max(40)
  })
  .strict()

export const FEED_MODES = ['full', 'collapsed', 'hidden'] as const
export type FeedMode = (typeof FEED_MODES)[number]

export const feedConfigSchema = z
  .object({
    mode: z.enum(FEED_MODES)
  })
  .strict()

export type OverlayConfig = z.infer<typeof overlayConfigSchema>

export const appConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabledTools: toolEnablementSchema.default(DEFAULT_TOOL_ENABLEMENT),
    platforms: z.object({
      bilibili: bilibiliConfigSchema,
      mock: mockConfigSchema
    }),
    tools: z.object({
      dice: diceConfigSchema,
      wheel: wheelConfigSchema,
      vote: voteConfigSchema
    }),
    network: networkConfigSchema.default(DEFAULT_NETWORK_CONFIG),
    overlay: overlayConfigSchema,
    window: windowConfigSchema,
    feed: feedConfigSchema
  })
  .strict()

export type AppConfig = z.infer<typeof appConfigSchema>

export const DEFAULT_APP_CONFIG: AppConfig = {
  schemaVersion: 1,
  enabledTools: { ...DEFAULT_TOOL_ENABLEMENT },
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
      segments: [...DEFAULT_WHEEL_CONFIG.segments],
      presets: DEFAULT_WHEEL_CONFIG.presets.map((preset) => ({
        ...preset,
        segments: [...preset.segments]
      }))
    },
    vote: {
      ...DEFAULT_VOTE_CONFIG,
      options: [...DEFAULT_VOTE_CONFIG.options],
      commandAliases: [...DEFAULT_VOTE_CONFIG.commandAliases],
      presets: DEFAULT_VOTE_CONFIG.presets.map((preset) => ({
        ...preset,
        options: [...preset.options]
      }))
    }
  },
  network: {
    ...DEFAULT_NETWORK_CONFIG
  },
  overlay: {
    alwaysOnTop: true
  },
  window: {
    display: 'cursor'
  },
  feed: {
    mode: 'full'
  }
}

export function diceConfigFrom(config: AppConfig): DiceConfig {
  return config.tools.dice
}
