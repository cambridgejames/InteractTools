import { reactive } from 'vue'
import type { DiceConfig } from '@contracts/dice'
import type { ToolAction } from '@contracts/tool'
import type { EngineEvent } from '@contracts/engine'
import type { LogEntry } from '@contracts/log'
import type { PlatformId, PlatformPhase } from '@contracts/platform'
import type { DiceToolView, EngineSnapshot, PlatformView } from '@contracts/view'

export type Tone = 'success' | 'error' | 'info'

export interface Toast {
  readonly id: number
  readonly tone: Tone
  readonly message: string
}

export const state = reactive<{
  snapshot: EngineSnapshot | null
  logs: LogEntry[]
  toast: Toast | null
  loading: boolean
  activeToolId: string
}>({
  snapshot: null,
  logs: [],
  toast: null,
  loading: true,
  activeToolId: 'dice'
})

let started = false
let toastTimer: ReturnType<typeof setTimeout> | null = null
let toastSeq = 0

export async function initStore(): Promise<void> {
  if (started) return
  started = true
  try {
    applySnapshot(await window.api.snapshot())
    window.api.onEvent(handleEvent)
  } catch (error) {
    showToast(errorMessage(error), 'error')
  } finally {
    state.loading = false
  }
}

export function showToast(message: string, tone: Tone = 'info'): void {
  if (toastTimer !== null) clearTimeout(toastTimer)
  state.toast = { id: ++toastSeq, tone, message }
  toastTimer = setTimeout(() => {
    state.toast = null
    toastTimer = null
  }, 3200)
}

export function selectDice(snapshot: EngineSnapshot | null): DiceToolView | null {
  const tool = snapshot?.tools.find((item) => item.toolId === 'dice')
  return tool ?? null
}

export function selectTool(snapshot: EngineSnapshot | null, toolId: string) {
  return snapshot?.tools.find((item) => item.toolId === toolId) ?? null
}

export function selectActiveTool(snapshot: EngineSnapshot | null) {
  return selectTool(snapshot, state.activeToolId) ?? snapshot?.tools[0] ?? null
}

export function selectPlatform(snapshot: EngineSnapshot | null, id: PlatformId): PlatformView | null {
  return snapshot?.platforms.find((item) => item.descriptor.id === id) ?? null
}

export function connectedCount(snapshot: EngineSnapshot | null): number {
  return snapshot?.platforms.filter((item) => item.status.phase === 'connected').length ?? 0
}

export function platformPhaseLabel(phase: PlatformPhase): string {
  switch (phase) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中'
    case 'reconnecting':
      return '重连中'
    case 'error':
      return '异常'
    case 'disconnected':
      return '未连接'
  }
}

export const actions = {
  async startDice(): Promise<void> {
    await run(() => window.api.toolAction('dice', { type: 'start' }))
  },

  async cancelDice(): Promise<void> {
    await run(() => window.api.toolAction('dice', { type: 'cancel' }), '已取消本轮')
  },

  async previewDice(): Promise<void> {
    await run(() => window.api.toolAction('dice', { type: 'preview' }))
  },

  async toolAction(toolId: string, action: ToolAction): Promise<void> {
    await run(() => window.api.toolAction(toolId, action))
  },

  async updateToolConfig(
    toolId: string,
    patch: Readonly<Record<string, unknown>>
  ): Promise<boolean> {
    try {
      await window.api.updateToolConfig(toolId, patch)
      return true
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return false
    }
  },

  async clearHistory(): Promise<void> {
    await run(() => window.api.toolAction('dice', { type: 'clear-history' }), '历史已清空')
  },

  async updateDiceConfig(patch: Partial<DiceConfig>): Promise<void> {
    await run(() => window.api.updateToolConfig('dice', patch))
  },

  async connect(id: PlatformId): Promise<void> {
    await run(() => window.api.connectPlatform(id), '已连接')
  },

  async disconnect(id: PlatformId): Promise<void> {
    await run(() => window.api.disconnectPlatform(id))
  },

  async updatePlatformConfig(
    id: PlatformId,
    patch: Readonly<Record<string, unknown>>
  ): Promise<boolean> {
    try {
      await window.api.updatePlatformConfig(id, patch)
      return true
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return false
    }
  },

  async simulateChat(userName: string, text: string): Promise<boolean> {
    try {
      await window.api.simulateChat({ userName, text })
      return true
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return false
    }
  },

  async clearFeed(): Promise<void> {
    await run(() => window.api.clearFeed())
  },

  async previewTool(toolId: string): Promise<void> {
    await run(() => window.api.previewTool(toolId))
  },

  async previewActiveTool(): Promise<void> {
    const tool = selectActiveTool(state.snapshot)
    if (tool === null) {
      showToast('当前没有可用工具', 'error')
      return
    }
    await actions.previewTool(tool.toolId)
  },

  selectTool(toolId: string): void {
    state.activeToolId = toolId
  },

  async updateOverlaySettings(patch: { alwaysOnTop?: boolean }): Promise<void> {
    await run(() => window.api.updateOverlaySettings(patch))
  },

  async openDataFolder(): Promise<void> {
    await run(() => window.api.openDataFolder())
  }
}

async function run<T>(task: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const value = await task()
    if (success !== undefined) showToast(success, 'success')
    return value
  } catch (error) {
    showToast(errorMessage(error), 'error')
    return undefined
  }
}

function handleEvent(event: EngineEvent): void {
  switch (event.type) {
    case 'snapshot':
      applySnapshot(event.snapshot)
      return
    case 'feed': {
      const snapshot = state.snapshot
      if (snapshot === null) return
      state.snapshot = {
        ...snapshot,
        feed: [...snapshot.feed, event.item].slice(-120)
      }
      return
    }
    case 'log':
      state.logs = [event.entry, ...state.logs].slice(0, 100)
      return
    case 'presentation':
      return
  }
}

function applySnapshot(snapshot: EngineSnapshot): void {
  state.snapshot = snapshot
  if (!snapshot.tools.some((tool) => tool.toolId === state.activeToolId)) {
    state.activeToolId = snapshot.tools[0]?.toolId ?? ''
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']+': Error: /, '')
}
