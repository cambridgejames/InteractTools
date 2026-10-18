import type { RendererApi } from '@contracts/ipc'

declare global {
  interface Window {
    api: RendererApi
  }
}

export {}
