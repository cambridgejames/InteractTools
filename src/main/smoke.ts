import { app } from 'electron'
import { join } from 'node:path'
import type { Application } from './composition'

/** --smoke：启动、截图、预览骰子与转盘，退出。只用于本地验收与 CI。 */
export async function runSmoke(application: Application): Promise<void> {
  const output = join(process.cwd(), 'artifacts', 'smoke')

  application.controlWindow.show()
  await delay(1_200)
  await application.controlWindow.capture(join(output, 'control.png'))

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.tool-tab')[1]?.click()"
  )
  await delay(400)
  await application.controlWindow.capture(join(output, 'control-wheel.png'))

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.nav-item')[2]?.click()"
  )
  await delay(300)
  await application.controlWindow.capture(join(output, 'control-platforms.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.nav-item')[0]?.click()"
  )
  await delay(300)

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.tool-tab')[0]?.click()"
  )
  await delay(200)

  await application.engine.previewTool('dice')
  await delay(1_500)
  await application.controlWindow.capture(join(output, 'control-dice-rolling.png'))
  await waitForResult(application)
  await application.resultWindow.capture(join(output, 'result-dice.png'))
  await application.engine.dismissOverlay()
  await delay(300)

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.tool-tab')[1]?.click()"
  )
  await delay(200)

  await application.engine.previewTool('wheel')
  await delay(1_500)
  await application.controlWindow.capture(join(output, 'control-wheel-rolling.png'))
  await waitForResult(application)
  await application.resultWindow.capture(join(output, 'result-wheel.png'))

  console.info('[smoke] screenshots:', output)
  app.quit()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForResult(application: Application): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < 15_000) {
    if (application.resultWindow.isVisible()) {
      await delay(260)
      return
    }
    await delay(100)
  }
}
