import type { ToolManifest } from '@contracts/tool'

export const voteManifest: ToolManifest = {
  id: 'vote',
  name: '弹幕投票',
  description: '观众用弹幕投票，倒计时结束后统计结果',
  version: '0.1.0',
  icon: 'vote',
  commands: ['投票', 'vote'],
  keywords: ['投票', '弹幕投票', '选项', '票数', '统计', 'vote', 'poll']
}
