import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import archiver from 'archiver'
import { createLogger, format, transports, type Logger as WinstonLogger } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LogEntry, LogLevel, Logger } from '@contracts/log'

/** 日志文件按天 + 20MB 滚动；winston-daily-rotate-file 会压缩旧文件并最多保留 20 个。 */
const MAX_LOG_SIZE = '20m'
const MAX_LOG_FILES = '20'

export class AppLogger implements Logger {
  private readonly entries: LogEntry[] = []
  private readonly listeners = new Set<(entry: LogEntry) => void>()
  private readonly winston: WinstonLogger
  private readonly logDir: string
  private readonly exportDir: string
  private seq = 0

  constructor(userDataDir: string, level: LogLevel = 'info') {
    this.logDir = join(userDataDir, 'logs')
    this.exportDir = join(this.logDir, 'exports')
    mkdirSync(this.logDir, { recursive: true })

    const line = format.printf((info) => {
      const scope = typeof info.scope === 'string' ? info.scope : 'app'
      const detail = typeof info.detail === 'string' && info.detail.length > 0 ? ' | ' + info.detail : ''
      return `${String(info.timestamp)} ${info.level.toUpperCase().padEnd(5)} main ${scope} ${String(info.message)}${detail}`
    })

    this.winston = createLogger({
      level,
      format: format.combine(
        format.timestamp({ format: () => formatTime(new Date()) }),
        line
      ),
      transports: [
        new DailyRotateFile({
          dirname: this.logDir,
          filename: 'interact-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: MAX_LOG_SIZE,
          maxFiles: MAX_LOG_FILES,
          zippedArchive: true,
          auditFile: join(this.logDir, '.audit.json'),
          format: format.combine(
            format.timestamp({ format: () => formatTime(new Date()) }),
            line
          )
        }),
        new transports.Console({
          format: format.combine(
            format.timestamp({ format: () => formatTime(new Date()) }),
            line
          )
        })
      ]
    })
  }

  debug(scope: string, message: string, detail?: string): void {
    this.write('debug', scope, message, detail)
  }

  info(scope: string, message: string, detail?: string): void {
    this.write('info', scope, message, detail)
  }

  warn(scope: string, message: string, detail?: string): void {
    this.write('warn', scope, message, detail)
  }

  error(scope: string, message: string, detail?: string): void {
    this.write('error', scope, message, detail)
  }

  setLevel(level: LogLevel): void {
    this.winston.level = level
    for (const transport of this.winston.transports) transport.level = level
    this.info('logging', '日志等级切换为 ' + level)
  }

  close(): void {
    this.winston.close()
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  recent(): readonly LogEntry[] {
    return [...this.entries]
  }

  /** 把当前日志打包为 zip，供用户直接拖进 issue。 */
  async collect(): Promise<string> {
    if (!existsSync(this.exportDir)) mkdirSync(this.exportDir, { recursive: true })
    const stamp = formatFileStamp(new Date())
    const target = join(this.exportDir, 'interact-logs-' + stamp + '.zip')
    const files = readdirSync(this.logDir)
      .filter((file) => file.endsWith('.log') || file.endsWith('.gz'))
      .filter((file) => !file.startsWith('exports'))
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(target)
      const archive = archiver('zip', { zlib: { level: 9 } })
      output.on('close', () => resolve())
      output.on('error', reject)
      archive.on('error', reject)
      archive.pipe(output)
      for (const file of files) archive.file(join(this.logDir, file), { name: file })
      void archive.finalize()
    })
    this.info('logging', '日志已收集', target)
    return target
  }

  private write(level: LogLevel, scope: string, message: string, detail?: string): void {
    const entry: LogEntry = {
      id: 'log-' + ++this.seq,
      level,
      scope,
      message,
      at: Date.now(),
      ...(detail === undefined ? {} : { detail })
    }

    this.entries.push(entry)
    if (this.entries.length > 200) this.entries.shift()

    this.winston.log(level, message, {
      scope,
      ...(detail === undefined ? {} : { detail })
    })
    for (const listener of this.listeners) listener(entry)
  }
}

function formatTime(date: Date): string {
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
    '.' + pad(date.getMilliseconds(), 3)
  )
}

function formatFileStamp(date: Date): string {
  return formatTime(date).replace(/[-: ]/g, '').replace('.', '-')
}
