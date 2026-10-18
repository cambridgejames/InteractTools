import { BrowserWindow, screen } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { IPC } from '@contracts/ipc'
import type { DiceResultPresentation, WheelResultPresentation } from '@contracts/presentation'

export type ResultPayload = DiceResultPresentation | WheelResultPresentation

const WIDTH = 680
const HEIGHT = 480

/** 只显示最终结果的原生小窗；动画在主窗口面板内完成。 */
export class ResultWindow {
  private readonly window: BrowserWindow
  private ready = false
  private pending: ResultPayload | null = null

  constructor(
    preloadPath: string,
    anchor: { x: number; y: number; width: number; height: number }
  ) {
    const display = screen.getDisplayMatching(anchor)
    const x = Math.round(display.bounds.x + (display.bounds.width - WIDTH) / 2)
    const y = Math.round(display.bounds.y + (display.bounds.height - HEIGHT) / 2)

    this.window = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      x,
      y,
      show: false,
      title: '1017 互动结果',
      frame: false,
      resizable: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    this.window.setAlwaysOnTop(true, 'screen-saver')
  }

  async load(): Promise<void> {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl !== undefined && devUrl.length > 0) {
      await this.window.loadURL(devUrl + '/result.html')
    } else {
      await this.window.loadFile(join(__dirname, '../renderer/result.html'))
    }
  }

  markReady(): void {
    this.ready = true
    this.flush()
  }

  present(result: ResultPayload): void {
    if (this.window.isDestroyed()) return
    this.pending = result
    this.flush()
  }

  dismiss(): void {
    this.pending = null
    if (!this.window.isDestroyed()) this.window.hide()
  }

  isVisible(): boolean {
    return !this.window.isDestroyed() && this.window.isVisible()
  }

  async capture(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    const image = await this.window.webContents.capturePage()
    await writeFile(path, image.toPNG())
  }

  get browserWindow(): BrowserWindow {
    return this.window
  }

  private flush(): void {
    if (!this.ready || this.pending === null || this.window.isDestroyed()) return
    this.window.webContents.send(IPC.resultPresent, this.pending)
    this.window.showInactive()
    this.pending = null
  }
}
