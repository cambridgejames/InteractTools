import type { Clock } from '@contracts/time'

export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }
}
