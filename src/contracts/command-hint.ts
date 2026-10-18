/** 当前正在收集的玩法命令，供模拟源生成对应弹幕。 */
export interface CommandHint {
  readonly toolId: string
  readonly samples: readonly string[]
}

/** 只读订阅面；模拟源不需要发布能力。 */
export interface CommandHintSource {
  snapshot(): readonly CommandHint[]
  subscribe(listener: (hints: readonly CommandHint[]) => void): () => void
}
