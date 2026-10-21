import type { ToolManifest } from '@contracts/tool'

export const wheelManifest: ToolManifest = {
  id: 'wheel',
  name: '转转盘',
  description: '主播手动触发，不依赖弹幕命令；适合抽奖、选品和现场决策。',
  version: '0.1.0',
  icon: 'wheel',
  commands: [],
  keywords: ['转盘', '转转盘', '抽奖', '选品', '随机', 'wheel', '旋转']
}
