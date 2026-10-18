import type { ToolManifest } from '@contracts/tool'

export const diceManifest: ToolManifest = {
  id: 'dice',
  name: '投骰子',
  description: '观众用弹幕设置力度，倒计时结束后用真实刚体物理掷骰。',
  version: '0.1.0',
  commands: ['!力度 <0-100>', '#力度 80', '力度80']
}
