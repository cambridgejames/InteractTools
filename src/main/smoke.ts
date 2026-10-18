import { app } from 'electron'
import { join } from 'node:path'
import type { Application } from './composition'

/** --smoke：启动、截图、走一遍投票/骰子/转盘，退出。只用于本地验收与 CI。 */
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
    "document.querySelectorAll('.tool-tab')[2]?.click()"
  )
  await delay(250)
  await application.controlWindow.capture(join(output, 'control-vote.png'))

  await application.engine.updateToolConfig('vote', {
    question: '今晚玩什么？',
    options: ['继续主线', '打副本', '聊天'],
    countdownSeconds: 5
  })
  await application.engine.toolAction('vote', { type: 'start' })
  await application.engine.simulateChat({ userName: '小满', text: '!投票 1' })
  await application.engine.simulateChat({ userName: '阿七', text: '投票 打副本' })
  await application.engine.simulateChat({ userName: '团子', text: '投票 3' })
  await application.engine.simulateChat({ userName: '小满', text: '投票 聊天' })
  await delay(350)
  await application.controlWindow.capture(join(output, 'control-vote-collecting.png'))
  await application.engine.toolAction('vote', { type: 'end' })
  await waitForResult(application)
  await application.controlWindow.capture(join(output, 'control-vote-result.png'))
  await application.engine.dismissOverlay()
  await delay(300)

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.tool-tab')[0]?.click()"
  )
  await delay(200)

  await application.engine.previewTool('dice')
  await delay(1_500)
  await application.controlWindow.capture(join(output, 'control-dice-rolling.png'))
  await waitForResult(application)
  await application.controlWindow.capture(join(output, 'control-dice-result.png'))
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
  await application.controlWindow.capture(join(output, 'control-wheel-result.png'))

  console.info('[smoke] screenshots:', output)
  app.quit()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForResult(application: Application): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < 15_000) {
    const visible = await application.controlWindow.browserWindow.webContents.executeJavaScript(
      "Boolean(document.querySelector('.result-pop'))"
    )
    if (visible === true) {
      await delay(260)
      return
    }
    await delay(100)
  }
}
