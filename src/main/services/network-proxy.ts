import { session } from 'electron'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import type { NetworkConfig, NetworkProxyInfo, NetworkTestResult } from '@contracts/network'

const TEST_URL = 'https://api.live.bilibili.com/room/v1/Room/room_init?id=6'
const TEST_TIMEOUT_MS = 8_000

/**
 * 把用户配置翻译成两层代理：
 * - Electron session：让窗口内的网络请求和应用自身一致；
 * - 平台请求：B站适配器直接读取 proxyUrl，用 undici / ws 的代理 agent。
 *
 * 这里不保存历史配置，NetworkConfig 的唯一事实源仍在 config.json。
 */
export class NetworkProxy implements NetworkProxyInfo {
  private resolved: string | null = null
  private lastError: string | null = null

  get proxyUrl(): string | null {
    return this.resolved
  }

  async apply(config: NetworkConfig): Promise<void> {
    this.lastError = null
    try {
      this.resolved = await resolveProxyUrl(config)
    } catch (error) {
      this.resolved = null
      this.lastError = error instanceof Error ? error.message : String(error)
    }

    try {
      if (config.proxyMode === 'none') {
        await session.defaultSession.setProxy({ mode: 'direct' })
      } else if (config.proxyMode === 'system') {
        await session.defaultSession.setProxy({ mode: 'system' })
      } else if (this.resolved !== null) {
        await session.defaultSession.setProxy({
          mode: 'fixed_servers',
          proxyRules: this.resolved.replace(/^https?:\/\//, '')
        })
      } else {
        await session.defaultSession.setProxy({ mode: 'direct' })
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
    }
  }

  async test(): Promise<NetworkTestResult> {
    const proxyUrl = this.resolved
    const startedAt = Date.now()
    if (this.lastError !== null) {
      return {
        ok: false,
        latencyMs: 0,
        proxyUrl,
        message: this.lastError
      }
    }
    try {
      const response = await undiciFetch(TEST_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
        ...(proxyUrl === null ? {} : { dispatcher: new ProxyAgent(proxyUrl) })
      })
      const latencyMs = Date.now() - startedAt
      await response.body?.cancel()
      if (!response.ok) {
        return {
          ok: false,
          latencyMs,
          proxyUrl,
          message: 'B站接口返回 HTTP ' + String(response.status)
        }
      }
      return {
        ok: true,
        latencyMs,
        proxyUrl,
        message: proxyUrl === null ? '直连正常' : '代理连通正常'
      }
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        proxyUrl,
        message: this.lastError ?? (error instanceof Error ? error.message : String(error))
      }
    }
  }
}

async function resolveProxyUrl(config: NetworkConfig): Promise<string | null> {
  if (config.proxyMode === 'none') return null
  if (config.proxyMode === 'custom') return normalizeProxyUrl(config.proxyUrl)

  const result = await session.defaultSession.resolveProxy(TEST_URL)
  return parseResolvedProxy(result)
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
