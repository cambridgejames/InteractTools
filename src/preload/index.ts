import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { EngineEvent } from '@contracts/engine'
import { IPC, type RendererApi } from '@contracts/ipc'
import type { Presentation } from '@contracts/presentation'

const api: RendererApi = {
  snapshot: () => ipcRenderer.invoke(IPC.snapshot),

  onEvent(listener) {
    const handler = (_event: IpcRendererEvent, event: EngineEvent): void => listener(event)
    ipcRenderer.on(IPC.event, handler)
    return () => {
      ipcRenderer.removeListener(IPC.event, handler)
    }
  },

  onPresentation(listener) {
    const handler = (_event: IpcRendererEvent, presentation: Presentation): void => listener(presentation)
    ipcRenderer.on(IPC.overlayPresent, handler)
    return () => {
      ipcRenderer.removeListener(IPC.overlayPresent, handler)
    }
  },

  onNavigate(listener) {
    const handler = (_event: IpcRendererEvent, page: 'dashboard' | 'tools' | 'settings'): void => listener(page)
    ipcRenderer.on(IPC.navigate, handler)
    return () => {
      ipcRenderer.removeListener(IPC.navigate, handler)
    }
  },

  connectPlatform: (id) => ipcRenderer.invoke(IPC.platformConnect, id),
  disconnectPlatform: (id) => ipcRenderer.invoke(IPC.platformDisconnect, id),
  updatePlatformConfig: (id, patch) => ipcRenderer.invoke(IPC.platformUpdateConfig, id, patch),

  toolAction: (toolId, action) => ipcRenderer.invoke(IPC.toolAction, toolId, action),
  updateToolConfig: (toolId, patch) => ipcRenderer.invoke(IPC.toolUpdateConfig, toolId, patch),
  setToolEnabled: (toolId, enabled) => ipcRenderer.invoke(IPC.toolSetEnabled, toolId, enabled),

  simulateChat: (input) => ipcRenderer.invoke(IPC.mockChat, input),
  clearFeed: () => ipcRenderer.invoke(IPC.clearFeed),

  previewTool: (toolId) => ipcRenderer.invoke(IPC.overlayPreview, toolId),
  dismissOverlay: () => ipcRenderer.invoke(IPC.overlayDismissed),

  openDataFolder: () => ipcRenderer.invoke(IPC.openDataFolder),

  windowDisplays: () => ipcRenderer.invoke(IPC.windowDisplays),
  setWindowDisplay: (display) => ipcRenderer.invoke(IPC.windowDisplay, display),
  setFeedMode: (mode) => ipcRenderer.invoke(IPC.feedSetMode, mode),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  clearAllData: () => ipcRenderer.invoke(IPC.clearAllData),
  updateNetworkConfig: (patch) => ipcRenderer.invoke(IPC.networkUpdate, patch),
  testNetwork: () => ipcRenderer.invoke(IPC.networkTest),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke(IPC.shortcutsUpdate, shortcuts),
  updateUi: (patch) => ipcRenderer.invoke(IPC.uiUpdate, patch),
  platform: process.platform === 'darwin' ? 'darwin' : process.platform === 'linux' ? 'linux' : 'win32'
}

contextBridge.exposeInMainWorld('api', api)
