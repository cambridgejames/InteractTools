import { appConfigSchema, DEFAULT_APP_CONFIG, type AppConfig } from '@contracts/config'
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

      this.current = parsed.data
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
