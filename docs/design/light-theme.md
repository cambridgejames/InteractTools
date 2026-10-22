# 浅色主题规范

参考 awesome-design-md 的产品型浅色界面：暖灰纸面、白色浮层、发丝边框、深色正文，强调色只用于主操作和状态。互动工坊保留青柠品牌，但当背景为白色时改用深橄榄 `#5c7800`，保证对比度。

## 变量映射

| 角色 | 深色 | 浅色 |
| --- | --- | --- |
| canvas | #08090b | #f4f5ef |
| canvas-elevated | #0b0d10 | #ffffff |
| surface | #111317 | #fbfcf8 |
| inset | #0d0f12 | #f7f8f3 |
| hairline | #23272e | #e1e4d9 |
| ink | #f2f4f1 | #161a13 |
| body | #c4c9c2 | #3d4537 |
| mute | #8a9188 | #66705d |
| accent | #c8ff3d | #5c7800 |
| accent-ink | #0a0c08 | #ffffff |

## 规则

- 默认深色；用户可选浅色或跟随系统。
- 跟随系统时监听 `prefers-color-scheme`，实时切换，不刷新窗口。
- 原生标题栏 overlay 同步换色：深色 `#0b0d10/#f2f4f1`，浅色 `#ffffff/#161a13`。
- 3D 骰桌是固定的演播室场景，不随主题变白；结果弹窗和文字仍走 token。
- 阴影在浅色下降低不透明度，避免脏灰；遮罩仍保持深色半透明。
