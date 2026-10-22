import { Agent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici'
import type { NetworkProxyInfo } from '@contracts/network'

/** 直连域名匹配：支持精确域名和 .example.com 后缀。 */
export function proxyUrlFor(url: string, network: NetworkProxyInfo): string | null {
  let host: string
  try { host = new URL(url).hostname.toLowerCase() } catch { return network.proxyUrl }
  for (const rule of network.bypass) {
    const value = rule.toLowerCase().replace(/^\./, '')
    if (host === value || host.endsWith('.' + value)) return null
  }
  return network.proxyUrl
}

/** 平台探测共用的 fetch 调度器；只影响平台请求，不改 Node 全局 TLS 配置。 */
export function createProbeDispatcher(network: NetworkProxyInfo): Dispatcher | null {
  if (network.proxyUrl !== null) {
    return new ProxyAgent({
      uri: network.proxyUrl,
      requestTls: { rejectUnauthorized: !network.allowInsecureTls },
      proxyTls: { rejectUnauthorized: !network.allowInsecureTls }
    })
  }
  return network.allowInsecureTls
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : null
}

export interface ProbeResponse {
  readonly status: number
  readonly latencyMs: number
}

/** 轻量 HEAD/GET 探测，不解析业务响应，只确认网络可达。 */
export async function probeUrl(
  url: string,
  network: NetworkProxyInfo,
  signal: AbortSignal,
  headers: Record<string, string> = {}
): Promise<ProbeResponse> {
  const startedAt = Date.now()
  const effective: NetworkProxyInfo = {
    ...network,
    proxyUrl: proxyUrlFor(url, network)
  }
  const dispatcher = createProbeDispatcher(effective)
  try {
    const response = await undiciFetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*', ...headers },
      signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
      ...(dispatcher === null ? {} : { dispatcher })
    })
    await response.body?.cancel()
    return { status: response.status, latencyMs: Date.now() - startedAt }
  } finally {
    if (dispatcher !== null) void dispatcher.close().catch(() => undefined)
  }
}
