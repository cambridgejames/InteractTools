import { app } from 'electron'
import { join } from 'node:path'
import { DiceTool } from '@tools/dice/tool'
import { WheelTool } from '@tools/wheel/tool'
import { VoteTool } from '@tools/vote/tool'
import { Engine } from '@kernel/engine'
import { MathRandom } from '@kernel/random'
import { bilibiliAdapterFactory } from '@platforms/bilibili'
import { douyinAdapterFactory } from '@platforms/douyin'
import { mockAdapterFactory } from '@platforms/mock'
import { ControlWindow } from './windows/control-window'
import { ResultSurface } from './surface/result-surface'
import { AppLogger } from './services/logger'
import { JsonConfigStore } from './services/config-store'
import { JsonHistoryStore } from './services/history-store'
import { NodeTimerFactory } from './services/timers'
import { SystemClock } from './services/clock'
import { registerIpc } from './ipc/handlers'
import { NetworkProxy } from './services/network-proxy'
import { ShortcutManager } from './services/shortcut-manager'

export interface Application {
  readonly engine: Engine
  readonly controlWindow: ControlWindow
  readonly logger: AppLogger
  dispose(): Promise<void>
}

export async function createApplication(): Promise<Application> {
  const userData = app.getPath('userData')
  const logger = new AppLogger()
  const clock = new SystemClock()

  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build/icon.png')
  const store = new JsonConfigStore(join(userData, 'config.json'), logger)
  const config = await store.load()
  const network = new NetworkProxy()
  const controlWindow = new ControlWindow(
    join(__dirname, '../preload/index.js'),
    iconPath,
    config.window.display
  )
  const surface = new ResultSurface(controlWindow)

  logger.subscribe((entry) => controlWindow.send({ type: 'log', entry }))

  const engine = new Engine({
    clock,
    random: new MathRandom(),
    logger,
    network,
    onNetworkChange: (next) => network.apply(next),
    store,
    timerFactory: new NodeTimerFactory(),
    historyFactory: (toolId) => new JsonHistoryStore(join(userData, 'history', toolId + '.json'), logger),
    surface,
    platformFactories: [mockAdapterFactory, bilibiliAdapterFactory, douyinAdapterFactory],
    tools: [new DiceTool(), new WheelTool(), new VoteTool()],
    onEvent: (event) => controlWindow.send(event)
  })

  await engine.start()
  const shortcutManager = new ShortcutManager(controlWindow, engine)
  try {
    await shortcutManager.apply((await store.load()).shortcuts)
  } catch (error) {
    logger.warn('shortcuts', '快捷键注册失败，已保留为空', String(error))
  }
  registerIpc(engine, controlWindow, network, shortcutManager)
  await controlWindow.load()

  return {
    engine,
    controlWindow,
    logger,
    async dispose() {
      shortcutManager.dispose()
      await engine.shutdown()
    }
  }
}
