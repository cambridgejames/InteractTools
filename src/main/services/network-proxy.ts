import { session } from 'electron'
import type { NetworkConfig, NetworkProxyInfo } from '@contracts/network'

const TEST_URL = 'https://api.live.bilibili.com/room/v1/Room/room_init?id=6'

/**
 * 把用户配置翻译成两层代理：
 * - Electron session：让窗口内的网络请求和应用自身一致；
 * - 平台请求：B站适配器直接读取 proxyUrl，用 undici / ws 的代理 agent。
 *
 * 这里不保存历史配置，NetworkConfig 的唯一事实源仍在 config.json。
 */
export class NetworkProxy implements NetworkProxyInfo {
  private resolved: string | null = null
  private insecure = false
  private bypassList: readonly string[] = []

  get proxyUrl(): string | null {
    return this.resolved
  }

  get allowInsecureTls(): boolean {
    return this.insecure
  }

  get bypass(): readonly string[] {
    return this.bypassList
  }

  async apply(config: NetworkConfig): Promise<void> {
    this.insecure = config.allowInsecureTls
    this.bypassList = config.proxyBypass.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    try {
      this.resolved = await resolveProxyUrl(config)
    } catch {
      this.resolved = null
    }

    try {
      if (config.proxyMode === 'none') {
        await session.defaultSession.setProxy({ mode: 'direct' })
      } else if (config.proxyMode === 'system') {
        await session.defaultSession.setProxy({ mode: 'system' })
      } else if (this.resolved !== null) {
        await session.defaultSession.setProxy({
          mode: 'fixed_servers',
          proxyRules: stripCredentials(this.resolved),
          ...(config.proxyBypass.trim().length === 0
            ? {}
            : { proxyBypassRules: config.proxyBypass.split(/[\n,]/).map((v) => v.trim()).filter(Boolean).join(',') })
        })
      } else {
        await session.defaultSession.setProxy({ mode: 'direct' })
      }
    } catch {
      // setProxy 失败时保持上一次代理状态；连通性测试会暴露具体错误。
    }
  }

}

async function resolveProxyUrl(config: NetworkConfig): Promise<string | null> {
  if (config.proxyMode === 'none') return null
  const raw = config.proxyMode === 'custom'
    ? config.proxyUrl
    : parseResolvedProxy(await session.defaultSession.resolveProxy(TEST_URL))
  if (raw === null) return null
  return withCredentials(normalizeProxyUrl(raw), config.proxyUsername, config.proxyPassword)
}

function normalizeProxyUrl(raw: string): string {
  const value = raw.trim()
  if (value.length === 0) throw new Error('请填写代理地址')
  const url = new URL(value.includes('://') ? value : 'http://' + value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('目前只支持 HTTP/HTTPS 代理')
  }
  return url.toString().replace(/\/$/, '')
}

function withCredentials(value: string, username: string, password: string): string {
  const url = new URL(value)
  if (username.length > 0) url.username = username
  if (password.length > 0) url.password = password
  return url.toString().replace(/\/$/, '')
}

function stripCredentials(value: string): string {
  const url = new URL(value)
  url.username = ''
  url.password = ''
  return url.toString().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function parseResolvedProxy(raw: string): string | null {
  const entries = raw
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  for (const entry of entries) {
    if (entry === 'DIRECT') return null
    const [kind, address] = entry.split(/\s+/, 2)
    if (address === undefined) continue
    if (kind === 'PROXY' || kind === 'HTTP') return 'http://' + address
    if (kind === 'HTTPS') return 'http://' + address
  }

  throw new Error('系统代理不是可用的 HTTP 代理：' + raw)
}
