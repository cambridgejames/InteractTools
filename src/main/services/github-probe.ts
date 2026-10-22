import type { NetworkProxyInfo, PlatformProbeResult } from '@contracts/network'
import { probeUrl } from '../../platforms/probe'

const GITHUB_HOME = 'https://github.com/cambridgejames/InteractTools'

/** GitHub 不是平台适配器，但连通性测试需要和平台一起显示。 */
export async function probeGitHub(network: NetworkProxyInfo): Promise<PlatformProbeResult> {
  try {
    const result = await probeUrl(GITHUB_HOME, network, AbortSignal.timeout(8_000), {
      Accept: 'text/html'
    })
    return {
      platformId: 'github',
      name: 'GitHub',
      ok: result.status >= 200 && result.status < 400,
      latencyMs: result.latencyMs,
      message: 'HTTP ' + String(result.status)
    }
  } catch (error) {
    return {
      platformId: 'github',
      name: 'GitHub',
      ok: false,
      latencyMs: 0,
      message: error instanceof Error ? error.message : String(error)
    }
  }
}
