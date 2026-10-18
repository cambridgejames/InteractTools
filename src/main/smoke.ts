import { app } from 'electron'
import { join } from 'node:path'
import type { Application } from './composition'

/** --smoke：启动、截图、预览一次投骰、退出。只用于本地验收与 CI。 */
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

  await application.engine.previewTool('dice')
  await delay(1_800)
  await application.overlayWindow.capture(join(output, 'overlay-rolling.png'))

  await delay(8_500)
  await application.overlayWindow.capture(join(output, 'overlay.png'))

  await application.engine.previewTool('wheel')
  await delay(1_500)
  await application.overlayWindow.capture(join(output, 'overlay-wheel-spinning.png'))
  await delay(5_500)
  await application.overlayWindow.capture(join(output, 'overlay-wheel.png'))

  console.info('[smoke] screenshots:', output)
  app.quit()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
