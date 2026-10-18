import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type OverlayApi } from '@contracts/ipc'
import type { Presentation } from '@contracts/presentation'

const api: OverlayApi = {
  onPresentation(listener) {
    const handler = (_event: IpcRendererEvent, presentation: Presentation): void => {
      listener(presentation)
    }
    ipcRenderer.on(IPC.overlayPresent, handler)
    return () => {
      ipcRenderer.removeListener(IPC.overlayPresent, handler)
    }
  },
  ready() {
    void ipcRenderer.invoke(IPC.overlayReady)
  },
  dismiss() {
    void ipcRenderer.invoke(IPC.overlayDismissed)
  }
}

contextBridge.exposeInMainWorld('overlayApi', api)
