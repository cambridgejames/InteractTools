import { appConfigSchema, DEFAULT_APP_CONFIG, type AppConfig } from '@contracts/config'
import { DEFAULT_VOTE_CONFIG } from '@contracts/vote'
import { DEFAULT_WHEEL_CONFIG } from '@contracts/wheel'
import type { Logger } from '@contracts/log'
import type { ConfigStore } from '@kernel/ports'
import { readJsonFile, writeJsonFile } from './json-file'

/** 配置读取会做默认值合并；坏文件不阻塞启动。 */
export class JsonConfigStore implements ConfigStore {
  private current: AppConfig | null = null

  constructor(
    private readonly filePath: string,
    private readonly logger: Logger
  ) {}

  path(): string {
    return this.filePath
  }

  async load(): Promise<AppConfig> {
    if (this.current !== null) return this.current

    try {
      const raw = await readJsonFile(this.filePath)
      if (raw === null) {
        this.current = DEFAULT_APP_CONFIG
        return this.current
      }

      const parsed = appConfigSchema.safeParse(merge(DEFAULT_APP_CONFIG, raw))
      if (!parsed.success) {
        this.logger.error('config', '配置文件校验失败，使用默认配置', parsed.error.message)
        this.current = DEFAULT_APP_CONFIG
        return this.current
      }

      this.current = migrateDemoPresets(parsed.data)
      return this.current
    } catch (error) {
      this.logger.error('config', '读取配置失败，使用默认配置', String(error))
      this.current = DEFAULT_APP_CONFIG
      return this.current
    }
  }

  async save(config: AppConfig): Promise<void> {
    this.current = config
    await writeJsonFile(this.filePath, config)
  }
}

/** 旧用户配置如果仍是初始占位内容，补上可演示的真心话/大冒险预设。 */
function migrateDemoPresets(config: AppConfig): AppConfig {
  let next = config
  const wheel = config.tools.wheel
  const oldWheel = ['一等奖', '二等奖', '三等奖', '谢谢参与', '再来一次', '幸运奖']
  if (wheel.presets.length === 0 && same(wheel.segments, oldWheel)) {
    next = {
      ...next,
      tools: {
        ...next.tools,
        wheel: {
          ...DEFAULT_WHEEL_CONFIG,
          segments: [...DEFAULT_WHEEL_CONFIG.segments],
          presets: DEFAULT_WHEEL_CONFIG.presets.map((preset) => ({ ...preset, segments: [...preset.segments] }))
        }
      }
    }
  }

  const vote = next.tools.vote
  if (vote.presets.length === 0 && same(vote.options, ['方案 A', '方案 B', '方案 C'])) {
    next = {
      ...next,
      tools: {
        ...next.tools,
        vote: {
          ...DEFAULT_VOTE_CONFIG,
          options: [...DEFAULT_VOTE_CONFIG.options],
          presets: DEFAULT_VOTE_CONFIG.presets.map((preset) => ({ ...preset, options: [...preset.options] }))
        }
      }
    }
  }
  return next
}

function same(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function merge(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) return patch

  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    result[key] = merge(base[key], value)
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
