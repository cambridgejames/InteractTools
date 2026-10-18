import type { Presentation } from '@contracts/presentation'
import type { SurfaceHost } from '@kernel/ports'
import type { OverlayWindow } from '../windows/overlay-window'

/** 把呈现协议落到 Electron 窗口；内核不知道 BrowserWindow 的存在。 */
export class ElectronSurface implements SurfaceHost {
  constructor(
    private readonly overlay: OverlayWindow,
    private alwaysOnTop: boolean
  ) {}

  async present(presentation: Presentation): Promise<void> {
    if (presentation.kind === 'dismiss') {
      this.overlay.dismiss()
      return
    }

    this.overlay.setAlwaysOnTop(this.alwaysOnTop)
    this.overlay.present(presentation)
  }

  async dismiss(_toolId: string): Promise<void> {
    this.overlay.dismiss()
  }

  isOpen(): boolean {
    return this.overlay.isOpen()
  }

  setAlwaysOnTop(value: boolean): void {
    this.alwaysOnTop = value
    this.overlay.setAlwaysOnTop(value)
  }
}
