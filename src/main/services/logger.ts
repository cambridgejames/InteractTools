import type { LogEntry, LogLevel, Logger } from '@contracts/log'

/** 控制台 + 内存环形缓冲；UI 通过订阅拿到最近日志。 */
export class AppLogger implements Logger {
  private readonly entries: LogEntry[] = []
  private readonly listeners = new Set<(entry: LogEntry) => void>()
  private seq = 0

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

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  recent(): readonly LogEntry[] {
    return [...this.entries]
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

    switch (level) {
      case 'debug':
        console.debug('[' + scope + ']', message, detail ?? '')
        break
      case 'info':
        console.info('[' + scope + ']', message, detail ?? '')
        break
      case 'warn':
        console.warn('[' + scope + ']', message, detail ?? '')
        break
      case 'error':
        console.error('[' + scope + ']', message, detail ?? '')
        break
    }

    for (const listener of this.listeners) listener(entry)
  }
}
