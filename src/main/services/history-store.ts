import type { ToolHistory } from '@contracts/history'
import type { Logger } from '@contracts/log'
import { readJsonFile, writeJsonFile } from './json-file'

const LIMIT = 50

/** 每个工具一个 JSON 文件；写入串行化，避免连续两次投掷互相覆盖。 */
export class JsonHistoryStore implements ToolHistory {
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly filePath: string,
    private readonly logger: Logger
  ) {}

  async load(): Promise<readonly unknown[]> {
    try {
      const raw = await readJsonFile(this.filePath)
      return Array.isArray(raw) ? raw : []
    } catch (error) {
      this.logger.warn('history', '读取历史失败', String(error))
      return []
    }
  }

  append(entry: unknown): Promise<void> {
    return this.enqueue(async () => {
      const current = await this.readRaw()
      await writeJsonFile(this.filePath, [entry, ...current].slice(0, LIMIT))
    })
  }

  clear(): Promise<void> {
    return this.enqueue(async () => {
      await writeJsonFile(this.filePath, [])
    })
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task, task)
    return this.queue
  }

  private async readRaw(): Promise<unknown[]> {
    try {
      const raw = await readJsonFile(this.filePath)
      return Array.isArray(raw) ? raw : []
    } catch {
      return []
    }
  }
}
