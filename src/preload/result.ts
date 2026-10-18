import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type ResultApi } from '@contracts/ipc'
import type {
  DiceResultPresentation,
  VoteResultPresentation,
  WheelResultPresentation
} from '@contracts/presentation'

type ResultPayload = DiceResultPresentation | WheelResultPresentation | VoteResultPresentation

const api: ResultApi = {
  onPresentation(listener) {
    const handler = (_event: IpcRendererEvent, result: ResultPayload): void => listener(result)
    ipcRenderer.on(IPC.resultPresent, handler)
    return () => {
      ipcRenderer.removeListener(IPC.resultPresent, handler)
    }
  },
  ready: () => ipcRenderer.send(IPC.resultReady),
  dismiss: () => ipcRenderer.send(IPC.resultDismissed)
}

contextBridge.exposeInMainWorld('resultApi', api)
