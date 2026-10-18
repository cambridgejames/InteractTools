import type { RendererApi, ResultApi } from '@contracts/ipc'

declare global {
  interface Window {
    api: RendererApi
    resultApi: ResultApi
  }
}

export {}
