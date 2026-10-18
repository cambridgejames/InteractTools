import type { AppConfig } from '@contracts/config'
import type { Presentation } from '@contracts/presentation'
import type { Cancellable, TimerScope } from '@contracts/time'

export interface ConfigStore {
  load(): Promise<AppConfig>
  save(config: AppConfig): Promise<void>
  path(): string
}

/** 呈现介质：Electron 窗口、OBS 页面或测试里的记录器都实现它。 */
export interface SurfaceHost {
  present(presentation: Presentation): Promise<void>
  dismiss(toolId: string): Promise<void>
  isOpen(): boolean
}

export interface TimerFactory {
  create(scope: string): TimerScope
}

export type { Cancellable }
