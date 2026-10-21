import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createApplication, type Application } from './composition'
import { runSmoke } from './smoke'

let application: Application | null = null
let quitting = false

if (process.argv.includes('--smoke')) {
  app.setPath('userData', join(process.cwd(), 'artifacts', 'smoke', 'data'))
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    application?.controlWindow.show()
  })

  app.whenReady().then(start).catch((error: unknown) => {
    void reportFatal(error)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (event) => {
    if (quitting || application === null) return
    event.preventDefault()
    quitting = true
    void application.dispose().finally(() => app.quit())
  })
}

process.on('uncaughtException', (error) => {
  console.error('[main-uncaught]', error)
  void reportFatal(error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[main-rejection]', reason)
})

async function reportFatal(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error('[startup-error]', message)
  try {
    await writeFile(join(app.getPath('userData'), 'startup-error.log'), message + '\n', 'utf8')
  } catch {
    // 日志失败时也不能再弹阻塞对话框；直接退出。
  }
  app.quit()
}

function installMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }

  // macOS 保留编辑菜单（复制/粘贴），但不放 Cmd+Q/Cmd+W 的退出/关闭项。
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' }
      ]
    },
    { role: 'editMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function start(): Promise<void> {
  app.setName('互动工坊')
  app.setAppUserModelId('com.interact1017.studio')
  installMenu()
  application = await createApplication()
  application.controlWindow.show()
  application.controlWindow.browserWindow.on('closed', () => app.quit())

  if (process.argv.includes('--smoke')) {
    await runSmoke(application)
  }
}
