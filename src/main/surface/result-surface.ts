import type { Presentation } from '@contracts/presentation'
import type { SurfaceHost } from '@kernel/ports'
import type { ControlWindow } from '../windows/control-window'

/**
 * 所有呈现都回主窗口：动画给工具面板，结果给应用内 ResultOverlay。
 * 这样 OBS 采集控制台窗口时，结果弹窗也在画面里。
 */
export class ResultSurface implements SurfaceHost {
  private open = false

  constructor(private readonly control: ControlWindow) {}

  async present(presentation: Presentation): Promise<void> {
    if (presentation.kind === 'dismiss' || presentation.kind === 'dice.roll') {
      this.open = false
    } else {
      this.open = true
    }
    this.control.sendPresentation(presentation)
  }

  async dismiss(toolId: string): Promise<void> {
    this.open = false
    this.control.sendPresentation({ kind: 'dismiss', toolId })
  }

  isOpen(): boolean {
    return this.open
  }
}
