import { app, dialog } from 'electron'
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
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('互动工坊启动失败', message)
    app.quit()
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

async function start(): Promise<void> {
  app.setAppUserModelId('com.interact1017.studio')
  application = await createApplication()
  application.controlWindow.show()
  application.controlWindow.browserWindow.on('closed', () => app.quit())

  if (process.argv.includes('--smoke')) {
    await runSmoke(application)
  }
}
