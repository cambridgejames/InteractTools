import { z } from 'zod'

export const PROXY_MODES = ['none', 'system', 'custom'] as const
export type ProxyMode = (typeof PROXY_MODES)[number]

export const networkConfigSchema = z
  .object({
    proxyMode: z.enum(PROXY_MODES),
    proxyUrl: z.string().trim().max(2048),
    proxyUsername: z.string().trim().max(128).default(''),
    proxyPassword: z.string().max(256).default(''),
    /** 逗号或换行分隔的直连域名。 */
    proxyBypass: z.string().max(2048).default(''),
    allowInsecureTls: z.boolean().default(false)
  })
  .strict()

export type NetworkConfig = z.infer<typeof networkConfigSchema>

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  proxyMode: 'none',
  proxyUrl: '',
  proxyUsername: '',
  proxyPassword: '',
  proxyBypass: '',
  allowInsecureTls: false
}

/**
 * 平台层只读取最终生效的代理 URL，不关心它来自系统代理还是手填配置。
 * null 表示直连；主进程负责在配置变化时更新这个对象。
 */
export interface NetworkProxyInfo {
  readonly proxyUrl: string | null
  readonly allowInsecureTls: boolean
  readonly bypass: readonly string[]
}

export interface PlatformProbeResult {
  readonly platformId: string
  readonly name: string
  readonly ok: boolean
  readonly latencyMs: number
  readonly message: string
}

export interface NetworkTestResult {
  readonly ok: boolean
  readonly latencyMs: number
  readonly message: string
  readonly proxyUrl: string | null
  readonly platforms: readonly PlatformProbeResult[]
}
