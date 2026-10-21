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
    "document.querySelectorAll('.nav-item')[1]?.click()"
  )
  await delay(250)
  await application.controlWindow.capture(join(output, 'control-tools.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelector('.tools-head .search input')?.focus()"
  )
  application.controlWindow.browserWindow.webContents.insertText('物理')
  await delay(250)
  await application.controlWindow.capture(join(output, 'control-tool-search.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "const input = document.querySelector('.tools-head .search input'); if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }"
  )
  await delay(150)

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.nav-item')[3]?.click()"
  )
  await delay(250)
  await application.controlWindow.capture(join(output, 'control-settings-network.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.nav-item')[0]?.click()"
  )
  await delay(250)

  await application.engine.updateToolConfig('wheel', {
    presets: [
      {
        id: 'smoke-truth',
        name: '真心话',
        segments: ['上次最尴尬的事', '最想合作的主播', '手机里最舍不得删的照片', '最近一次哭是什么时候'],
        spinDurationSeconds: 5
      },
      {
        id: 'smoke-dare',
        name: '大冒险',
        segments: ['给榜一唱一句', '做十个深蹲', '模仿一个主播', '喝一口水'],
        spinDurationSeconds: 5
      }
    ]
  })
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
    "document.querySelectorAll('.nav-item')[3]?.click()"
  )
  await delay(300)
  await application.controlWindow.capture(join(output, 'control-settings.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelector('.app-select .trigger')?.click()"
  )
  await delay(150)
  await application.controlWindow.capture(join(output, 'control-settings-select.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))"
  )
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelector('.app-content')?.scrollTo(0, 99999)"
  )
  await delay(200)
  await application.controlWindow.capture(join(output, 'control-settings-about.png'))
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelector('.app-content')?.scrollTo(0, 0)"
  )
  await delay(150)
  await application.engine.updateFeedMode('collapsed')
  await delay(300)
  await application.controlWindow.capture(join(output, 'control-feed-collapsed.png'))
  await application.engine.updateFeedMode('hidden')
  await delay(300)
  await application.controlWindow.capture(join(output, 'control-feed-hidden.png'))
  await application.engine.updateFeedMode('full')
  await delay(300)
  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.nav-item')[0]?.click()"
  )
  await delay(300)

  await application.engine.updateToolConfig('vote', {
    presets: [
      {
        id: 'smoke-vote-truth',
        name: '真心话',
        question: '真心话',
        options: ['初恋', '糗事', '秘密', '理想型'],
        countdownSeconds: 30
      },
      {
        id: 'smoke-vote-dare',
        name: '大冒险',
        question: '大冒险',
        options: ['唱歌', '深蹲', '模仿', '喝水'],
        countdownSeconds: 30
      }
    ]
  })
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
  await application.engine.dismissOverlay()
  await delay(300)

  await application.controlWindow.browserWindow.webContents.executeJavaScript(
    "document.querySelectorAll('.tool-tab')[0]?.click()"
  )
  await application.engine.toolAction('dice', { type: 'direct' })
  await delay(900)
  await application.controlWindow.capture(join(output, 'control-dice-direct.png'))
  await waitForResult(application)

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
