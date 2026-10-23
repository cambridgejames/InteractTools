import { spawn } from 'node:child_process'
import { accessSync, constants, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { app, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fetch as undiciFetch } from 'undici'
import { z } from 'zod'
import type { NetworkProxyInfo } from '@contracts/network'
import type { UpdatesConfig } from '@contracts/config'
import { compareVersions, normalizeVersion, type UpdateState } from '@contracts/update'
import { createProbeDispatcher, proxyUrlFor } from '../../platforms/probe'
import type { Logger } from '@contracts/log'
import {
  buildApplyScript,
  findZipAsset,
  isZipInstall,
  readDirectoryNames,
  verifyDigest,
  type ReleaseAsset
} from './zip-update'

const RELEASE_API = 'https://api.github.com/repos/cambridgejames/InteractTools/releases/latest'
const releaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().url(),
  body: z.string().nullish(),
  assets: z
    .array(
      z.object({
        name: z.string(),
        browser_download_url: z.string().url(),
        size: z.number().optional(),
        digest: z.string().nullish()
      })
    )
    .default([])
})

export class UpdateService {
  private state: UpdateState
  private config: UpdatesConfig
  private timer: ReturnType<typeof setTimeout> | null = null
  private busy = false
  private assets: readonly ReleaseAsset[] = []
  private zipFile: string | null = null
  private readonly zipInstall = isZipInstall(
    app.getPath('exe'),
    readDirectoryNames(dirname(app.getPath('exe')))
  )

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
      this.assets = release.assets
      if (this.state.latestVersion !== latest) this.zipFile = null
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
    if (this.zipInstall) return this.downloadZip()
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

  private async downloadZip(): Promise<UpdateState> {
    const version = this.state.latestVersion
    const releaseUrl = this.state.releaseUrl
    if (version === undefined || releaseUrl === undefined) return this.state

    const asset = findZipAsset(this.assets, process.arch)
    if (asset === null) {
      await shell.openExternal(releaseUrl)
      this.set({ phase: 'available', message: '这个版本没有提供 zip 包，已打开 Release 页面' })
      return this.state
    }

    const installDir = dirname(app.getPath('exe'))
    try {
      accessSync(installDir, constants.W_OK)
    } catch {
      await shell.openExternal(releaseUrl)
      this.set({ phase: 'available', message: '安装目录不可写，请手动下载 zip 覆盖' })
      return this.state
    }

    const zipDir = join(app.getPath('userData'), 'updates', version)
    const zipPath = join(zipDir, basename(asset.name))
    this.set({ phase: 'downloading', progress: 5, message: '正在下载 zip 更新包' })
    const effective: NetworkProxyInfo = {
      ...this.network,
      proxyUrl: proxyUrlFor(asset.browser_download_url, this.network)
    }
    const dispatcher = createProbeDispatcher(effective)
    try {
      const response = await undiciFetch(asset.browser_download_url, {
        headers: { 'User-Agent': 'InteractTools/' + app.getVersion(), Accept: 'application/zip' },
        signal: AbortSignal.timeout(120_000),
        ...(dispatcher === null ? {} : { dispatcher })
      })
      if (!response.ok) throw new Error('下载 zip 更新包失败（HTTP ' + String(response.status) + '）')
      const buffer = Buffer.from(await response.arrayBuffer())
      if (!verifyDigest(buffer, asset.digest)) throw new Error('zip 更新包校验失败，请重新下载')
      mkdirSync(zipDir, { recursive: true })
      writeFileSync(zipPath, buffer)
      this.zipFile = zipPath
      this.set({ phase: 'downloaded', progress: 100, message: '更新已下载，重启后替换文件' })
    } catch (error) {
      this.zipFile = null
      this.fail(error)
    } finally {
      if (dispatcher !== null) void dispatcher.close().catch(() => undefined)
    }
    return this.state
  }

  private applyZip(zipPath: string): void {
    const installDir = dirname(app.getPath('exe'))
    const scriptPath = join(dirname(zipPath), 'apply-update.ps1')
    try {
      mkdirSync(dirname(scriptPath), { recursive: true })
      const script = buildApplyScript({
        processId: process.pid,
        zipPath,
        installDir,
        exePath: app.getPath('exe')
      })
      // Windows PowerShell 5.1 需要 BOM 才能正确读取中文路径。
      writeFileSync(scriptPath, '\uFEFF' + script, 'utf8')
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
        { detached: true, stdio: 'ignore', windowsHide: true }
      )
      child.on('error', (error: Error) => this.logger.warn('update', '启动 zip 更新脚本失败', error.message))
      child.unref()
      this.logger.info('update', 'zip 更新脚本已启动', scriptPath)
      setTimeout(() => app.quit(), 100)
    } catch (error) {
      this.fail(error)
    }
  }

  install(): void {
    if (this.zipInstall && this.zipFile !== null) {
      this.applyZip(this.zipFile)
      return
    }
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
      if (!response.ok) throw new Error('无法获取最新版本（HTTP ' + String(response.status) + '）')
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
