import { app, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fetch as undiciFetch } from 'undici'
import { z } from 'zod'
import type { NetworkProxyInfo } from '@contracts/network'
import type { UpdatesConfig } from '@contracts/config'
import { compareVersions, normalizeVersion, type UpdateState } from '@contracts/update'
import { createProbeDispatcher, proxyUrlFor } from '../../platforms/probe'
import type { Logger } from '@contracts/log'

const RELEASE_API = 'https://api.github.com/repos/cambridgejames/InteractTools/releases/latest'
const releaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().url(),
  body: z.string().nullish()
})

export class UpdateService {
  private state: UpdateState
  private config: UpdatesConfig
  private timer: ReturnType<typeof setTimeout> | null = null
  private busy = false

  constructor(
    private readonly network: NetworkProxyInfo,
    private readonly logger: Logger,
    config: UpdatesConfig,
    private readonly emit: (state: UpdateState) => void
  ) {
    this.config = config
    this.state = { phase: 'idle', currentVersion: app.getVersion() }
    autoUpdater.autoDownload = config.autoDownload
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('download-progress', (progress) => {
      this.set({ phase: 'downloading', progress: Math.round(progress.percent), message: '正在下载更新包' })
    })
    autoUpdater.on('update-downloaded', () => {
      this.set({ phase: 'downloaded', message: '更新已下载，重启后安装' })
    })
    autoUpdater.on('error', (error) => {
      if (this.state.phase === 'downloading') this.fail(error)
    })
  }

  stateNow(): UpdateState {
    return this.state
  }

  setConfig(next: UpdatesConfig): void {
    this.config = next
    autoUpdater.autoDownload = next.autoDownload
    if (!next.autoCheck) this.cancelTimer()
    else this.schedule()
  }

  start(): void {
    if (this.config.autoCheck) this.schedule()
  }

  async check(manual = false): Promise<UpdateState> {
    if (this.busy) return this.state
    this.busy = true
    this.set(manual ? { phase: 'checking', message: '正在检查更新' } : { phase: 'checking' })
    try {
      const release = await this.latestRelease()
      const current = normalizeVersion(app.getVersion())
      const latest = normalizeVersion(release.tag_name)
      if (compareVersions(latest, current) > 0) {
        this.set({
          phase: 'available',
          latestVersion: latest,
          releaseUrl: release.html_url,
          ...(release.body ? { notes: release.body } : {}),
          message: '发现新版本 v' + latest
        })
        if (this.config.autoDownload && app.isPackaged) void this.download()
        return this.state
      }
      this.set({ phase: 'not-available', latestVersion: latest, message: '已是最新版本' })
      return this.state
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        this.set({ phase: 'not-available', message: '暂无 Release 记录' })
      } else {
        this.fail(error)
      }
      return this.state
    } finally {
      this.busy = false
    }
  }

  async download(): Promise<UpdateState> {
    if (this.state.phase === 'downloading') return this.state
    if (this.state.releaseUrl === undefined) return this.state
    if (!app.isPackaged) {
      await shell.openExternal(this.state.releaseUrl)
      this.set({ phase: 'available', message: '开发模式不下载更新，已打开 Release 页面' })
      return this.state
    }
    this.set({ phase: 'downloading', progress: 0, message: '正在准备下载' })
    const previous = autoUpdater.autoDownload
    autoUpdater.autoDownload = false
    try {
      await autoUpdater.checkForUpdates()
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.fail(error)
    } finally {
      autoUpdater.autoDownload = previous
    }
    return this.state
  }

  install(): void {
    if (this.state.phase === 'downloaded') {
      autoUpdater.quitAndInstall()
      return
    }
    if (this.state.releaseUrl !== undefined) void shell.openExternal(this.state.releaseUrl)
  }

  dispose(): void {
    this.cancelTimer()
  }

  private schedule(): void {
    this.cancelTimer()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.check(false)
    }, 3_000)
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async latestRelease(): Promise<z.infer<typeof releaseSchema>> {
    const effective: NetworkProxyInfo = {
      ...this.network,
      proxyUrl: proxyUrlFor(RELEASE_API, this.network)
    }
    const dispatcher = createProbeDispatcher(effective)
    try {
      const response = await undiciFetch(RELEASE_API, {
        headers: {
          'User-Agent': 'InteractTools/' + app.getVersion(),
          Accept: 'application/vnd.github+json'
        },
        signal: AbortSignal.timeout(10_000),
        ...(dispatcher === null ? {} : { dispatcher })
      })
      if (!response.ok) throw new Error('GitHub Release 返回 HTTP ' + String(response.status))
      return releaseSchema.parse(await response.json())
    } finally {
      if (dispatcher !== null) void dispatcher.close().catch(() => undefined)
    }
  }

  private set(patch: Partial<UpdateState> & Pick<UpdateState, 'phase'>): void {
    this.state = { ...this.state, ...patch }
    this.emit(this.state)
    this.logger.info('update', '更新状态：' + this.state.phase, this.state.message)
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    this.set({ phase: 'error', message })
    this.logger.warn('update', '检查更新失败', message)
  }
}
