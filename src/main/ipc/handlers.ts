import { app, dialog, ipcMain, shell } from 'electron'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { IPC } from '@contracts/ipc'
import { networkConfigSchema } from '@contracts/network'
import { shortcutsConfigSchema, TOOL_IDS, uiConfigSchema } from '@contracts/config'
import type { Engine } from '@kernel/engine'
import type { ControlWindow } from '../windows/control-window'
import type { NetworkProxy } from '../services/network-proxy'
import { externalUrlSchema } from './external-url'
import type { ShortcutManager } from '../services/shortcut-manager'

const platformIdSchema = z.enum(['bilibili', 'douyin', 'mock'])
const toolIdSchema = z.enum(TOOL_IDS)
const feedModeSchema = z.enum(['full', 'collapsed', 'hidden'])
const patchSchema = z.record(z.string(), z.unknown())
const toolActionSchema = z.object({
  type: z.string().min(1).max(40),
  payload: z.unknown().optional()
})
const mockChatSchema = z.object({
  userName: z.string().trim().min(1).max(24),
  text: z.string().trim().min(1).max(200)
})
export function registerIpc(
  engine: Engine,
  controlWindow: ControlWindow,
  network: NetworkProxy,
  shortcuts: ShortcutManager
): void {
  ipcMain.handle(IPC.snapshot, async () => engine.snapshot())

  ipcMain.handle(IPC.networkUpdate, async (_event, rawPatch: unknown) => {
    const parsed = networkConfigSchema.partial().parse(rawPatch)
    const patch: { proxyMode?: 'none' | 'system' | 'custom'; proxyUrl?: string } = {}
    if (parsed.proxyMode !== undefined) patch.proxyMode = parsed.proxyMode
    if (parsed.proxyUrl !== undefined) patch.proxyUrl = parsed.proxyUrl
    await engine.updateNetworkConfig(patch)
  })

  ipcMain.handle(IPC.networkTest, async () => {
    const platforms = await engine.testPlatforms()
    const ok = platforms.some((item) => item.ok)
    return {
      ok,
      latencyMs: platforms.reduce((max, item) => Math.max(max, item.latencyMs), 0),
      message: ok ? '平台连通性测试完成' : '所有平台均不可达',
      proxyUrl: network.proxyUrl,
      platforms
    }
  })

  ipcMain.handle(IPC.toolSetEnabled, async (_event, rawId: unknown, rawEnabled: unknown) => {
    await engine.setToolEnabled(toolIdSchema.parse(rawId), z.boolean().parse(rawEnabled))
  })

  ipcMain.handle(IPC.windowDisplays, async () => controlWindow.displayOptions())

  ipcMain.handle(IPC.feedSetMode, async (_event, rawMode: unknown) => {
    await engine.updateFeedMode(feedModeSchema.parse(rawMode))
  })

  ipcMain.handle(IPC.openExternal, async (_event, rawUrl: unknown) => {
    await shell.openExternal(externalUrlSchema.parse(rawUrl))
  })

  ipcMain.handle(IPC.shortcutsUpdate, async (_event, rawShortcuts: unknown) => {
    const parsed = shortcutsConfigSchema.parse(rawShortcuts)
    await shortcuts.apply(parsed)
    await engine.updateShortcuts(parsed)
  })

  ipcMain.handle(IPC.uiUpdate, async (_event, rawPatch: unknown) => {
    const parsed = uiConfigSchema.partial().parse(rawPatch)
    const patch: {
      showActivePlatforms?: boolean
      showFeedPlatforms?: boolean
      showMockLabel?: boolean
      onboardingDone?: boolean
    } = {}
    if (parsed.showActivePlatforms !== undefined) patch.showActivePlatforms = parsed.showActivePlatforms
    if (parsed.showFeedPlatforms !== undefined) patch.showFeedPlatforms = parsed.showFeedPlatforms
    if (parsed.showMockLabel !== undefined) patch.showMockLabel = parsed.showMockLabel
    if (parsed.onboardingDone !== undefined) patch.onboardingDone = parsed.onboardingDone
    await engine.updateUi(patch)
  })

  ipcMain.handle(IPC.clearAllData, async () => {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['取消', '清除并重启'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      title: '清除所有数据',
      message: '确定要清除所有本地数据吗？',
      detail: '会删除配置、工具历史和日志，并重新启动应用。此操作不可撤销。'
    })
    if (choice.response !== 1) return false

    const userData = app.getPath('userData')
    await rm(join(userData, 'config.json'), { force: true })
    await rm(join(userData, 'history'), { recursive: true, force: true })
    await rm(join(userData, 'logs'), { recursive: true, force: true })
    app.relaunch()
    app.exit(0)
    return true
  })

  ipcMain.handle(IPC.windowDisplay, async (_event, rawDisplay: unknown) => {
    const display = z.string().trim().min(1).max(40).parse(rawDisplay)
    await engine.updateWindowDisplay(display)
    controlWindow.placeOnDisplay(display)
  })

  ipcMain.handle(IPC.platformConnect, async (_event, rawId: unknown) => {
    const id = platformIdSchema.parse(rawId)
    const result = await engine.connectPlatform(id)
    if (!result.ok) throw new Error(result.error)
  })

  ipcMain.handle(IPC.platformDisconnect, async (_event, rawId: unknown) => {
    const id = platformIdSchema.parse(rawId)
    await engine.disconnectPlatform(id)
  })

  ipcMain.handle(
    IPC.platformUpdateConfig,
    async (_event, rawId: unknown, rawPatch: unknown) => {
      const id = platformIdSchema.parse(rawId)
      const patch = patchSchema.parse(rawPatch)
      await engine.updatePlatformConfig(id, patch)
    }
  )

  ipcMain.handle(
    IPC.toolAction,
    async (_event, rawToolId: unknown, rawAction: unknown) => {
      const toolId = z.string().min(1).max(40).parse(rawToolId)
      const action = toolActionSchema.parse(rawAction)
      await engine.toolAction(toolId, action)
    }
  )

  ipcMain.handle(
    IPC.toolUpdateConfig,
    async (_event, rawToolId: unknown, rawPatch: unknown) => {
      const toolId = z.string().min(1).max(40).parse(rawToolId)
      await engine.updateToolConfig(toolId, patchSchema.parse(rawPatch))
    }
  )

  ipcMain.handle(IPC.mockChat, async (_event, rawInput: unknown) => {
    const input = mockChatSchema.parse(rawInput)
    const result = await engine.simulateChat(input)
    if (!result.ok) throw new Error(result.error)
  })

  ipcMain.handle(IPC.clearFeed, async () => engine.clearFeed())
  ipcMain.handle(IPC.overlayPreview, async (_event, rawToolId: unknown) => {
    const toolId = z.string().min(1).max(40).parse(rawToolId)
    await engine.previewTool(toolId)
  })
  ipcMain.handle(IPC.overlayDismissed, async () => engine.dismissOverlay())

  ipcMain.handle(IPC.openDataFolder, async () => {
    const error = await shell.openPath(app.getPath('userData'))
    if (error.length > 0) throw new Error(error)
  })
}
