import type { EngineEvent } from './engine'
import type { PlatformId } from './platform'
import type { Presentation } from './presentation'
import type { ToolAction } from './tool'
import type { EngineSnapshot } from './view'

export const IPC = {
  snapshot: 'engine:snapshot',
  event: 'engine:event',
  platformConnect: 'platform:connect',
  platformDisconnect: 'platform:disconnect',
  platformUpdateConfig: 'platform:update-config',
  toolAction: 'tool:action',
  toolUpdateConfig: 'tool:update-config',
  mockChat: 'mock:chat',
  overlayPreview: 'overlay:preview',
  overlayPresent: 'overlay:present',
  overlayDismissed: 'overlay:dismissed',
  openDataFolder: 'app:open-data-folder',
  clearFeed: 'feed:clear'
} as const

export interface InjectedChat {
  readonly userName: string
  readonly text: string
}

/** 控制台可用的全部能力；preload 只暴露这些方法，不暴露 ipcRenderer。 */
export interface RendererApi {
  snapshot(): Promise<EngineSnapshot>
  onEvent(listener: (event: EngineEvent) => void): () => void
  /** 动画 presentation（dice.roll / dismiss）发到控制台面板。 */
  onPresentation(listener: (presentation: Presentation) => void): () => void

  connectPlatform(id: PlatformId): Promise<void>
  disconnectPlatform(id: PlatformId): Promise<void>
  updatePlatformConfig(id: PlatformId, patch: Readonly<Record<string, unknown>>): Promise<void>

  toolAction(toolId: string, action: ToolAction): Promise<void>
  updateToolConfig(toolId: string, patch: Readonly<Record<string, unknown>>): Promise<void>

  simulateChat(input: InjectedChat): Promise<void>
  clearFeed(): Promise<void>

  previewTool(toolId: string): Promise<void>
  dismissOverlay(): Promise<void>

  openDataFolder(): Promise<void>
}
