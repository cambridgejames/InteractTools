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

export const douyinConfigSchema = z
  .object({
    enabled: z.boolean(),
    roomId: z.string().trim().max(256),
    /** 旧版配置遗留字段；本地签名后不再读取，只为兼容已保存配置。 */
    signerUrl: z.string().trim().max(512).optional()
  })
  .strict()

export type DouyinConfig = z.infer<typeof douyinConfigSchema>

export const mockConfigSchema = z
  .object({
    enabled: z.boolean(),
    botsEnabled: z.boolean(),
    botsIntervalSeconds: z.number().min(1).max(60),
    userCount: z.number().int().min(1).max(100).default(8),
    botNames: z.array(z.string().trim().min(1).max(24)).min(1).max(50)
  })
  .strict()

export type MockConfig = z.infer<typeof mockConfigSchema>

export const SHORTCUT_ACTIONS = ['toggleWindow', 'toggleFeed', 'clearFeed', 'openSettings'] as const
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const shortcutBindingSchema = z
  .object({
    /** 空字符串表示不绑定，默认全部为空。 */
    accelerator: z.string().trim().max(64),
    global: z.boolean()
  })
  .strict()

export const shortcutsConfigSchema = z
  .object({
    toggleWindow: shortcutBindingSchema,
    toggleFeed: shortcutBindingSchema,
    clearFeed: shortcutBindingSchema,
    openSettings: shortcutBindingSchema
  })
  .strict()

export type ShortcutBinding = z.infer<typeof shortcutBindingSchema>
export type ShortcutsConfig = z.infer<typeof shortcutsConfigSchema>

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  toggleWindow: { accelerator: '', global: false },
  toggleFeed: { accelerator: '', global: false },
  clearFeed: { accelerator: '', global: false },
  openSettings: { accelerator: '', global: false }
}

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export const loggingConfigSchema = z
  .object({ level: z.enum(LOG_LEVELS).default('info') })
  .strict()

export type LoggingConfig = z.infer<typeof loggingConfigSchema>
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = { level: 'info' }

export const THEME_MODES = ['dark', 'light', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const uiConfigSchema = z
  .object({
    theme: z.enum(THEME_MODES).default('dark'),
    showActivePlatforms: z.boolean().default(true),
    showFeedPlatforms: z.boolean().default(false),
    showMockLabel: z.boolean().default(true),
    onboardingDone: z.boolean().default(false)
  })
  .strict()

export type UiConfig = z.infer<typeof uiConfigSchema>

/** 部分更新不能带默认值，否则只改主题会被其它默认值覆盖。 */
export const uiPatchSchema = z
  .object({
    theme: z.enum(THEME_MODES),
    showActivePlatforms: z.boolean(),
    showFeedPlatforms: z.boolean(),
    showMockLabel: z.boolean(),
    onboardingDone: z.boolean()
  })
  .partial()
  .strict()

export const DEFAULT_UI_CONFIG: UiConfig = {
  theme: 'dark',
  showActivePlatforms: true,
  showFeedPlatforms: false,
  showMockLabel: true,
  onboardingDone: false
}

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
      douyin: douyinConfigSchema,
      mock: mockConfigSchema
    }),
    tools: z.object({
      dice: diceConfigSchema,
      wheel: wheelConfigSchema,
      vote: voteConfigSchema
    }),
    network: networkConfigSchema.default(DEFAULT_NETWORK_CONFIG),
    shortcuts: shortcutsConfigSchema.default(DEFAULT_SHORTCUTS),
    ui: uiConfigSchema.default(DEFAULT_UI_CONFIG),
    logging: loggingConfigSchema.default(DEFAULT_LOGGING_CONFIG),
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
    douyin: { enabled: false, roomId: '' },
    mock: {
      enabled: true,
      botsEnabled: true,
      botsIntervalSeconds: 3,
      userCount: 8,
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
  shortcuts: {
    toggleWindow: { accelerator: '', global: false },
    toggleFeed: { accelerator: '', global: false },
    clearFeed: { accelerator: '', global: false },
    openSettings: { accelerator: '', global: false }
  },
  ui: { ...DEFAULT_UI_CONFIG },
  logging: { ...DEFAULT_LOGGING_CONFIG },
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
