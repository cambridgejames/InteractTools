import type { Presentation } from '@contracts/presentation'
import type { SurfaceHost } from '@kernel/ports'
import type { ControlWindow } from '../windows/control-window'
import type { ResultWindow } from '../windows/result-window'

/**
 * 动画走主窗口面板，最终结果走原生小窗。
 * 这样面板里转/掷，结果再弹窗，不会在弹窗里重播整套动画。
 */
export class ResultSurface implements SurfaceHost {
  private open = false

  constructor(
    private readonly control: ControlWindow,
    private readonly result: ResultWindow
  ) {}

  async present(presentation: Presentation): Promise<void> {
    switch (presentation.kind) {
      case 'dice.roll':
        this.open = false
        this.result.dismiss()
        this.control.sendPresentation(presentation)
        return
      case 'dice.result':
      case 'wheel.result':
        this.open = true
        this.result.present(presentation.payload)
        return
      case 'dismiss':
        this.open = false
        this.result.dismiss()
        this.control.sendPresentation(presentation)
        return
    }
  }

  async dismiss(toolId: string): Promise<void> {
    this.open = false
    this.result.dismiss()
    this.control.sendPresentation({ kind: 'dismiss', toolId })
  }

  isOpen(): boolean {
    return this.open
  }
}
