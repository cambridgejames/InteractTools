import type { Cancellable, TimerScope } from '@contracts/time'
import type { TimerFactory } from '@kernel/ports'

/** 每个工具一个作用域；clearAll 只影响本工具，不会误杀别的定时器。 */
class NodeTimerScope implements TimerScope {
  private readonly handles = new Set<ReturnType<typeof setTimeout>>()

  constructor(_scope: string) {}

  setTimeout(delayMs: number, callback: () => void): Cancellable {
    const handle = setTimeout(() => {
      this.handles.delete(handle)
      callback()
    }, delayMs)
    this.handles.add(handle)
    return { cancel: () => this.cancel(handle) }
  }

  setInterval(intervalMs: number, callback: () => void): Cancellable {
    const handle = setInterval(callback, intervalMs)
    this.handles.add(handle)
    return { cancel: () => this.cancel(handle) }
  }

  clearAll(): void {
    for (const handle of [...this.handles]) this.cancel(handle)
  }

  private cancel(handle: ReturnType<typeof setTimeout>): void {
    clearTimeout(handle)
    clearInterval(handle)
    this.handles.delete(handle)
  }
}

export class NodeTimerFactory implements TimerFactory {
  create(scope: string): TimerScope {
    return new NodeTimerScope(scope)
  }
}
