export type PlatformErrorCode =
  | 'config'
  | 'network'
  | 'auth'
  | 'protocol'
  | 'rate-limited'
  | 'room-not-found'
  | 'unsupported'

/** 平台适配器只抛这一类错误，UI 直接展示 message。 */
export class PlatformError extends Error {
  readonly code: PlatformErrorCode

  constructor(code: PlatformErrorCode, message: string) {
    super(message)
    this.name = 'PlatformError'
    this.code = code
  }
}
