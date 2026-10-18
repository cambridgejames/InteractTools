import type { Component } from 'vue'
import DicePanel from './components/DicePanel.vue'
import WheelPanel from './components/WheelPanel.vue'
import VotePanel from './components/VotePanel.vue'

/**
 * 工具 id → 控制台面板。新增工具只需在这里注册一个组件；
 * DashboardView 不知道具体工具类型。
 */
export const TOOL_PANELS: Readonly<Record<string, Component>> = {
  dice: DicePanel,
  wheel: WheelPanel,
  vote: VotePanel
}
