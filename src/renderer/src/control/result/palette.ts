/** 3D 场景颜色；CSS 变量在 WebGL 里不可用，集中在这里便于对照 docs/design/ui-guidelines.md。 */
export interface ScenePalette {
  readonly faceLight: string
  readonly faceDark: string
  readonly faceEdge: string
  readonly ink: string
  readonly table: string
  readonly tableEdge: string
  readonly accent: string
  readonly info: string
  readonly bilibili: string
  readonly white: string
}

export const SCENE: ScenePalette = {
  faceLight: '#f7f1de',
  faceDark: '#e6dcc2',
  faceEdge: 'rgba(23, 22, 18, 0.18)',
  ink: '#171612',
  table: '#171b21',
  tableEdge: '#c8ff3d',
  accent: '#c8ff3d',
  info: '#64d8ff',
  bilibili: '#fb7299',
  white: '#f2f4f1'
}

/** 浅色主题：托盘变浅、高度线变深，骰子仍保持奶油色。 */
export const SCENE_LIGHT: ScenePalette = {
  ...SCENE,
  table: '#e5dfd0',
  tableEdge: '#39453a',
  accent: '#5c7800'
}
