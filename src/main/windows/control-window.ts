import { BrowserWindow, screen, shell, type Display } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { EngineEvent } from '@contracts/engine'
import { IPC } from '@contracts/ipc'
import type { Presentation } from '@contracts/presentation'

/** 主控制台窗口；只负责窗口生命周期与事件转发。 */
export class ControlWindow {
  private readonly window: BrowserWindow

  constructor(preloadPath: string, iconPath?: string, displayPreference = 'cursor') {
    const display = resolveDisplay(displayPreference)
    const bounds = centeredBounds(display)

    const isMac = process.platform === 'darwin'

    this.window = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      minWidth: 1120,
      minHeight: 720,
      show: false,
      // 去掉标题栏本身，但保留系统原生窗口控件。
      // Windows/Linux 用 titleBarOverlay 画系统最小化/最大化/关闭；macOS 用原生红绿灯。
      ...(isMac
        ? {
            titleBarStyle: 'hiddenInset' as const,
            trafficLightPosition: { x: 16, y: 18 }
          }
        : {
            titleBarStyle: 'hidden' as const,
            titleBarOverlay: {
              color: '#0b0d10',
              symbolColor: '#f2f4f1',
              height: 48
            }
          }),
      backgroundColor: '#08090b',
      autoHideMenuBar: true,
      title: '互动工坊',
      ...(iconPath === undefined ? {} : { icon: iconPath }),
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    // 所有外部链接都交给系统默认浏览器，绝不在 Electron 窗口里打开 GitHub。
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url).catch(() => undefined)
      return { action: 'deny' }
    })
    this.window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('https://')) return
      event.preventDefault()
      void shell.openExternal(url).catch(() => undefined)
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

  /** 把窗口居中到指定屏幕；'cursor' 跟随鼠标，'primary' 主屏，其余是 Display.id。 */
  placeOnDisplay(preference: string): void {
    const bounds = centeredBounds(resolveDisplay(preference))
    this.window.setBounds(bounds)
  }

  displayOptions(): readonly {
    id: string
    label: string
    width: number
    height: number
    primary: boolean
  }[] {
    const primaryId = screen.getPrimaryDisplay().id
    return screen.getAllDisplays().map((display, index) => ({
      id: String(display.id),
      label: display.label.trim().length > 0 ? display.label : '显示器 ' + String(index + 1),
      width: display.size.width,
      height: display.size.height,
      primary: display.id === primaryId
    }))
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
function resolveDisplay(preference: string): Display {
  if (preference === 'primary') return screen.getPrimaryDisplay()
  if (preference === 'cursor') return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())

  return (
    screen.getAllDisplays().find((display) => String(display.id) === preference) ??
    screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  )
}

function centeredBounds(display: Display): { x: number; y: number; width: number; height: number } {
  const workArea = display.workArea
  const width = Math.min(1560, Math.max(1120, workArea.width - 120))
  const height = Math.min(960, Math.max(720, workArea.height - 100))
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  }
}
