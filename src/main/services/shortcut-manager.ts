import { globalShortcut } from 'electron'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutsConfig
} from '@contracts/config'
import type { Engine } from '@kernel/engine'
import type { ControlWindow } from '../windows/control-window'

interface ParsedAccelerator {
  readonly controlOrCommand: boolean
  readonly control: boolean
  readonly command: boolean
  readonly alt: boolean
  readonly shift: boolean
  readonly key: string
}

/**
 * 应用快捷键：默认全部为空。
 *
 * 本地快捷键只在本窗口聚焦时生效；global 为 true 时交给 Electron
 * globalShortcut。退出/关闭组合永远不允许绑定，避免直播中误触。
 */
export class ShortcutManager {
  private bindings: ShortcutsConfig = DEFAULT_SHORTCUTS
  private readonly listener: (event: Electron.Event, input: Electron.Input) => void

  constructor(
    private readonly window: ControlWindow,
    private readonly engine: Engine
  ) {
    this.listener = (event, input) => this.handleInput(event, input)
    this.window.browserWindow.webContents.on('before-input-event', this.listener)
  }

  async apply(next: ShortcutsConfig): Promise<void> {
    const parsed = new Map<ShortcutAction, ParsedAccelerator>()
    for (const action of SHORTCUT_ACTIONS) {
      const binding = next[action]
      if (binding.accelerator.length === 0) continue
      const accelerator = parseAccelerator(binding.accelerator)
      if (accelerator === null) throw new Error('快捷键格式无效：' + binding.accelerator)
      if (isCloseShortcut(accelerator)) throw new Error('不能绑定关闭/退出快捷键')
      parsed.set(action, accelerator)
    }

    globalShortcut.unregisterAll()
    for (const action of SHORTCUT_ACTIONS) {
      const binding = next[action]
      if (binding.accelerator.length === 0 || !binding.global) continue
      if (!globalShortcut.register(binding.accelerator, () => void this.run(action))) {
        globalShortcut.unregisterAll()
        throw new Error('全局快捷键被占用：' + binding.accelerator)
      }
    }
    this.bindings = next
  }

  dispose(): void {
    globalShortcut.unregisterAll()
    if (!this.window.browserWindow.isDestroyed()) {
      this.window.browserWindow.webContents.removeListener('before-input-event', this.listener)
    }
  }

  private handleInput(event: Electron.Event, input: Electron.Input): void {
    for (const action of SHORTCUT_ACTIONS) {
      const binding = this.bindings[action]
      if (binding.accelerator.length === 0 || binding.global) continue
      const parsed = parseAccelerator(binding.accelerator)
      if (parsed === null) continue
      if (matches(parsed, input)) {
        event.preventDefault()
        void this.run(action)
        return
      }
    }
  }

  private async run(action: ShortcutAction): Promise<void> {
    if (action === 'toggleWindow') {
      const win = this.window.browserWindow
      if (win.isVisible() && win.isFocused()) win.hide()
      else {
        win.show()
        win.focus()
      }
      return
    }

    if (action === 'clearFeed') {
      this.engine.clearFeed()
      return
    }

    if (action === 'openSettings') {
      const win = this.window.browserWindow
      win.show()
      win.focus()
      this.window.navigate('settings')
      return
    }

    const mode = this.engine.snapshot().feedMode
    await this.engine.updateFeedMode(mode === 'hidden' ? 'full' : 'hidden')
  }
}

function parseAccelerator(accelerator: string): ParsedAccelerator | null {
  const parts = accelerator.split('+').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const key = parts.pop()
  if (key === undefined) return null
  let controlOrCommand = false
  let control = false
  let command = false
  let alt = false
  let shift = false
  for (const modifier of parts) {
    const token = modifier.toLowerCase()
    if (token === 'commandorcontrol' || token === 'cmdorctrl') controlOrCommand = true
    else if (token === 'control' || token === 'ctrl') control = true
    else if (token === 'command' || token === 'cmd') command = true
    else if (token === 'alt') alt = true
    else if (token === 'shift') shift = true
    else return null
  }
  if (!controlOrCommand && !control && !command && !alt && !shift) return null
  return { controlOrCommand, control, command, alt, shift, key: normalizeKey(key) }
}

function normalizeKey(key: string): string {
  const special: Record<string, string> = {
    ' ': 'SPACE',
    arrowup: 'UP',
    arrowdown: 'DOWN',
    arrowleft: 'LEFT',
    arrowright: 'RIGHT',
    escape: 'ESCAPE',
    enter: 'RETURN',
    backspace: 'BACKSPACE',
    delete: 'DELETE',
    tab: 'TAB',
    home: 'HOME',
    end: 'END',
    pageup: 'PAGEUP',
    pagedown: 'PAGEDOWN'
  }
  return special[key.toLowerCase()] ?? key.toUpperCase()
}

function isCloseShortcut(parsed: ParsedAccelerator): boolean {
  const close = parsed.key === 'W' || parsed.key === 'Q' || (parsed.alt && parsed.key === 'F4')
  return close && (parsed.controlOrCommand || parsed.control || parsed.command || parsed.alt)
}

function matches(parsed: ParsedAccelerator, input: Electron.Input): boolean {
  const isMac = process.platform === 'darwin'
  const wantsControl = parsed.control || (parsed.controlOrCommand && !isMac)
  const wantsCommand = parsed.command || (parsed.controlOrCommand && isMac)
  if (input.control !== wantsControl) return false
  if (input.meta !== wantsCommand) return false
  if (input.alt !== parsed.alt) return false
  if (input.shift !== parsed.shift) return false
  return normalizeKey(input.key) === parsed.key
}
