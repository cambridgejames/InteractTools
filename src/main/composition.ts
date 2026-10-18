import { app } from 'electron'
import { join } from 'node:path'
import { DiceTool } from '@tools/dice/tool'
import { WheelTool } from '@tools/wheel/tool'
import { Engine } from '@kernel/engine'
import { MathRandom } from '@kernel/random'
import { bilibiliAdapterFactory } from '@platforms/bilibili'
import { mockAdapterFactory } from '@platforms/mock'
import { ControlWindow } from './windows/control-window'
import { OverlayWindow } from './windows/overlay-window'
import { ElectronSurface } from './surface/electron-surface'
import { AppLogger } from './services/logger'
import { JsonConfigStore } from './services/config-store'
import { JsonHistoryStore } from './services/history-store'
import { NodeTimerFactory } from './services/timers'
import { SystemClock } from './services/clock'
import { registerIpc } from './ipc/handlers'

export interface Application {
  readonly engine: Engine
  readonly controlWindow: ControlWindow
  readonly overlayWindow: OverlayWindow
  readonly logger: AppLogger
  dispose(): Promise<void>
}

export async function createApplication(): Promise<Application> {
  const userData = app.getPath('userData')
  const logger = new AppLogger()
  const clock = new SystemClock()

  const controlWindow = new ControlWindow(join(__dirname, '../preload/index.js'))
  const store = new JsonConfigStore(join(userData, 'config.json'), logger)
  const config = await store.load()
  const overlayWindow = new OverlayWindow(
    join(__dirname, '../preload/overlay.js'),
    config.overlay.alwaysOnTop
  )
  const surface = new ElectronSurface(overlayWindow, config.overlay.alwaysOnTop)

  logger.subscribe((entry) => controlWindow.send({ type: 'log', entry }))

  const engine = new Engine({
    clock,
    random: new MathRandom(),
    logger,
    store,
    timerFactory: new NodeTimerFactory(),
    historyFactory: (toolId) => new JsonHistoryStore(join(userData, 'history', toolId + '.json'), logger),
    surface,
    platformFactories: [mockAdapterFactory, bilibiliAdapterFactory],
    tools: [new DiceTool(), new WheelTool()],
    onEvent: (event) => controlWindow.send(event)
  })

  // 先注册 IPC、启动内核，再加载窗口：渲染进程一挂载就会取快照。
  registerIpc(engine, overlayWindow)
  await engine.start()
  await Promise.all([controlWindow.load(), overlayWindow.load()])

  return {
    engine,
    controlWindow,
    overlayWindow,
    logger,
    async dispose() {
      await engine.shutdown()
    }
  }
}
