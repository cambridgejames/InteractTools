import { z } from 'zod'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

const heartbeatSchema = z.object({
  intervalMs: z.number().positive(),
  payloadHex: z.string()
})

const signResponseSchema = z
  .object({
    roomId: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    wssUrl: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
    heartbeat: heartbeatSchema.optional()
  })
  .passthrough()

export interface DouyinSignResult {
  readonly roomId: string
  readonly title: string
  readonly wssUrl: string
  readonly headers: Readonly<Record<string, string>>
  readonly heartbeat: { readonly intervalMs: number; readonly payloadHex: string } | null
}

export interface DouyinSigner {
  sign(roomId: string, signal: AbortSignal): Promise<DouyinSignResult>
}

/**
 * 抖音 webcast 的签名不是稳定公开协议，项目不内置绕过算法。
 * 通过用户配置的本地/自建签名服务换取短期 WSS URL；服务契约与
 * DouyinLiveJava 的 /sign 保持一致。
 */
export class HttpDouyinSigner implements DouyinSigner {
  constructor(
    private readonly baseUrl: string,
    private readonly proxyUrl: string | null = null
  ) {}

  async sign(roomId: string, signal: AbortSignal): Promise<DouyinSignResult> {
    const endpoint = this.baseUrl.replace(/\/$/, '').endsWith('/sign')
      ? this.baseUrl.replace(/\/$/, '')
      : this.baseUrl.replace(/\/$/, '') + '/sign'
    const options = {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ liveId: roomId }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)])
    }
    const response = this.proxyUrl === null
      ? await fetch(endpoint, options)
      : await undiciFetch(endpoint, { ...options, dispatcher: new ProxyAgent(this.proxyUrl) })
    if (!response.ok) {
      throw new Error('抖音签名服务返回 HTTP ' + String(response.status))
    }
    const parsed = signResponseSchema.parse(await response.json())
    return {
      roomId: parsed.roomId === undefined ? roomId : String(parsed.roomId),
      title: parsed.title ?? '',
      wssUrl: parsed.wssUrl,
      headers: parsed.headers ?? {},
      heartbeat: parsed.heartbeat ?? null
    }
  }
}
