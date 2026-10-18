/** 单调递增的毫秒时钟；测试可替换为手动推进的假时钟。 */
export interface Clock {
  now(): number
}

export interface Cancellable {
  cancel(): void
}

/** 每个工具持有独立作用域，停用时一次清理，避免跨工具误杀定时器。 */
export interface TimerScope {
  setTimeout(delayMs: number, callback: () => void): Cancellable
  setInterval(intervalMs: number, callback: () => void): Cancellable
  clearAll(): void
}

/** 返回 [0, 1) 的随机数；物理 seed 与模拟源都从这里取，测试可注入固定序列。 */
export interface RandomSource {
  next(): number
}
