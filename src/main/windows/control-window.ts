import { BrowserWindow, screen } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { EngineEvent } from '@contracts/engine'
import { IPC } from '@contracts/ipc'
import type { Presentation } from '@contracts/presentation'

/** 主控制台窗口；只负责窗口生命周期与事件转发。 */
export class ControlWindow {
  private readonly window: BrowserWindow

  constructor(preloadPath: string) {
    const workArea = screen.getPrimaryDisplay().workAreaSize
    const width = Math.min(1560, Math.max(1120, workArea.width - 120))
    const height = Math.min(960, Math.max(720, workArea.height - 100))

    this.window = new BrowserWindow({
      width,
      height,
      minWidth: 1120,
      minHeight: 720,
      show: false,
      backgroundColor: '#08090b',
      autoHideMenuBar: true,
      title: '1017 互动工坊',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    this.window.once('ready-to-show', () => this.window.show())
  }

  async load(): Promise<void> {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl !== undefined && devUrl.length > 0) {
      await this.window.loadURL(devUrl + '/index.html')
    } else {
      await this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  send(event: EngineEvent): void {
    if (this.window.isDestroyed()) return
    this.window.webContents.send(IPC.event, event)
  }

  sendPresentation(presentation: Presentation): void {
    if (this.window.isDestroyed()) return
    this.window.webContents.send(IPC.overlayPresent, presentation)
  }

  show(): void {
    this.window.show()
  }

  async capture(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    const image = await this.window.webContents.capturePage()
    await writeFile(path, image.toPNG())
  }

  get browserWindow(): BrowserWindow {
    return this.window
  }
}
