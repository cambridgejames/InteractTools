import { douyinConfigSchema } from '@contracts/config'
import type { PlatformAdapterFactory } from '@contracts/platform'
import { DouyinAdapter } from './adapter'

export const douyinAdapterFactory: PlatformAdapterFactory = {
  descriptor: {
    id: 'douyin',
    name: '抖音',
    capabilities: ['chat.read', 'gift.read', 'member.read']
  },
  configSchema: douyinConfigSchema,
  create: (context) => new DouyinAdapter(context)
}
