export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  readonly id: string
  readonly level: LogLevel
  readonly scope: string
  readonly message: string
  readonly at: number
  readonly detail?: string
}

export interface Logger {
  debug(scope: string, message: string, detail?: string): void
  info(scope: string, message: string, detail?: string): void
  warn(scope: string, message: string, detail?: string): void
  error(scope: string, message: string, detail?: string): void
}
