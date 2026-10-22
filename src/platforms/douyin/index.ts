import { douyinConfigSchema } from '@contracts/config'
import type { PlatformAdapterFactory } from '@contracts/platform'
import { DouyinAdapter } from './adapter'
import { probeUrl } from '../probe'

export const douyinAdapterFactory: PlatformAdapterFactory = {
  descriptor: {
    id: 'douyin',
    name: '抖音',
    capabilities: ['chat.read', 'gift.read', 'member.read']
  },
  configSchema: douyinConfigSchema,
  async probe(_config, context) {
    try {
      const result = await probeUrl('https://live.douyin.com/', context.network, context.signal)
      return {
        ok: result.status >= 200 && result.status < 400,
        latencyMs: result.latencyMs,
        message: 'HTTP ' + String(result.status)
      }
    } catch (error) {
      return { ok: false, latencyMs: 0, message: error instanceof Error ? error.message : String(error) }
    }
  },
  create: (context) => new DouyinAdapter(context)
}
