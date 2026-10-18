import type { OverlayApi, RendererApi } from '@contracts/ipc'

declare global {
  interface Window {
    api: RendererApi
    overlayApi: OverlayApi
  }
}

export {}
