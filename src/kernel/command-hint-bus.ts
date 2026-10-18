import type { CommandHint, CommandHintSource } from '@contracts/command-hint'

/**
 * 工具 -> 模拟源的单向发布订阅。
 *
 * 工具只发布“当前收集阶段可用的命令样本”，不了解 mock；模拟源订阅后
 * 决定何时把这些样本注入成弹幕。这样新增玩法不需要改模拟源。
 */
export class CommandHintBus implements CommandHintSource {
  private readonly hints = new Map<string, CommandHint>()
  private readonly listeners = new Set<(hints: readonly CommandHint[]) => void>()

  snapshot(): readonly CommandHint[] {
    return [...this.hints.values()].map((hint) => ({
      toolId: hint.toolId,
      samples: [...hint.samples]
    }))
  }

  subscribe(listener: (hints: readonly CommandHint[]) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  publish(hint: CommandHint): void {
    const samples = hint.samples.map((sample) => sample.trim()).filter((sample) => sample.length > 0)
    if (samples.length === 0) {
      this.clear(hint.toolId)
      return
    }
    this.hints.set(hint.toolId, { toolId: hint.toolId, samples })
    this.emit()
  }

  clear(toolId: string): void {
    if (!this.hints.delete(toolId)) return
    this.emit()
  }

  clearAll(): void {
    if (this.hints.size === 0) return
    this.hints.clear()
    this.emit()
  }

  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}
