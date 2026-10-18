import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { EngineEvent } from '@contracts/engine'
import { IPC, type RendererApi } from '@contracts/ipc'

const api: RendererApi = {
  snapshot: () => ipcRenderer.invoke(IPC.snapshot),

  onEvent(listener) {
    const handler = (_event: IpcRendererEvent, event: EngineEvent): void => listener(event)
    ipcRenderer.on(IPC.event, handler)
    return () => {
      ipcRenderer.removeListener(IPC.event, handler)
    }
  },

  connectPlatform: (id) => ipcRenderer.invoke(IPC.platformConnect, id),
  disconnectPlatform: (id) => ipcRenderer.invoke(IPC.platformDisconnect, id),
  updatePlatformConfig: (id, patch) => ipcRenderer.invoke(IPC.platformUpdateConfig, id, patch),

  toolAction: (toolId, action) => ipcRenderer.invoke(IPC.toolAction, toolId, action),
  updateToolConfig: (toolId, patch) => ipcRenderer.invoke(IPC.toolUpdateConfig, toolId, patch),

  simulateChat: (input) => ipcRenderer.invoke(IPC.mockChat, input),
  clearFeed: () => ipcRenderer.invoke(IPC.clearFeed),

  previewTool: (toolId) => ipcRenderer.invoke(IPC.overlayPreview, toolId),
  dismissOverlay: () => ipcRenderer.invoke(IPC.overlayDismiss),
  updateOverlaySettings: (patch) => ipcRenderer.invoke(IPC.overlaySettings, patch),

  openDataFolder: () => ipcRenderer.invoke(IPC.openDataFolder)
}

contextBridge.exposeInMainWorld('api', api)
