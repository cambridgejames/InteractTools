import { BrowserWindow, screen } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { IPC } from '@contracts/ipc'
import type { DiceRollPresentation } from '@contracts/presentation'

const WIDTH = 1080
const HEIGHT = 680

/** 透明置顶结果窗；OBS 用窗口捕获即可上屏。 */
export class OverlayWindow {
  private readonly window: BrowserWindow
  private loaded = false
  private pending: DiceRollPresentation | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(preloadPath: string, alwaysOnTop: boolean) {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const x = Math.round(display.workArea.x + (display.workArea.width - WIDTH) / 2)
    const y = Math.round(display.workArea.y + (display.workArea.height - HEIGHT) / 2)

    this.window = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      x,
      y,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop,
      title: '1017 投骰子',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    this.window.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
    this.window.setIgnoreMouseEvents(true, { forward: true })
    this.window.webContents.on('did-finish-load', () => this.markReady())
  }

  async load(): Promise<void> {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl !== undefined && devUrl.length > 0) {
      await this.window.loadURL(devUrl + '/overlay.html')
    } else {
      await this.window.loadFile(join(__dirname, '../renderer/overlay.html'))
    }
  }

  markReady(): void {
    this.loaded = true
    if (this.pending !== null) {
      const payload = this.pending
      this.pending = null
      this.deliver(payload)
    }
  }

  present(payload: DiceRollPresentation): void {
    if (!this.loaded) {
      this.pending = payload
      return
    }
    this.deliver(payload)
  }

  dismiss(): void {
    this.clearCloseTimer()
    this.pending = null
    if (!this.window.isDestroyed()) this.window.hide()
  }

  isOpen(): boolean {
    return !this.window.isDestroyed() && this.window.isVisible()
  }

  setAlwaysOnTop(value: boolean): void {
    if (this.window.isDestroyed()) return
    this.window.setAlwaysOnTop(value, 'screen-saver')
  }

  async capture(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    const image = await this.window.webContents.capturePage()
    await writeFile(path, image.toPNG())
  }

  private deliver(payload: DiceRollPresentation): void {
    if (this.window.isDestroyed()) return
    this.window.webContents.send(IPC.overlayPresent, { kind: 'dice.roll', payload })
    this.window.showInactive()
    this.scheduleSafetyClose(payload)
  }

  private scheduleSafetyClose(payload: DiceRollPresentation): void {
    this.clearCloseTimer()
    const playback = payload.frames.length * payload.frameSeconds * 1000
    const delay = Math.max(5_000, playback + payload.autoCloseSeconds * 1000 + 10_000)
    this.closeTimer = setTimeout(() => this.dismiss(), delay)
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
  }
}
