import { app } from 'electron'
import { join } from 'node:path'
import { DiceTool } from '@tools/dice/tool'
import { WheelTool } from '@tools/wheel/tool'
import { VoteTool } from '@tools/vote/tool'
import { Engine } from '@kernel/engine'
import { MathRandom } from '@kernel/random'
import { bilibiliAdapterFactory } from '@platforms/bilibili'
import { mockAdapterFactory } from '@platforms/mock'
import { ControlWindow } from './windows/control-window'
import { ResultSurface } from './surface/result-surface'
import { AppLogger } from './services/logger'
import { JsonConfigStore } from './services/config-store'
import { JsonHistoryStore } from './services/history-store'
import { NodeTimerFactory } from './services/timers'
import { SystemClock } from './services/clock'
import { registerIpc } from './ipc/handlers'

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

  const controlWindow = new ControlWindow(join(__dirname, '../preload/index.js'))
  const store = new JsonConfigStore(join(userData, 'config.json'), logger)
  await store.load()
  const surface = new ResultSurface(controlWindow)

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
    tools: [new DiceTool(), new WheelTool(), new VoteTool()],
    onEvent: (event) => controlWindow.send(event)
  })

  registerIpc(engine)
  await engine.start()
  await controlWindow.load()

  return {
    engine,
    controlWindow,
    logger,
    async dispose() {
      await engine.shutdown()
    }
  }
}
