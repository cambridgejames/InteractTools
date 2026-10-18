---
name: design-review
description: 实现或修改任何界面、组件、弹窗、配色前使用；强制对照 DESIGN.md 与 tokens.css，检查状态、间距、截图与裸颜色。
---

# 设计规格执行

## 何时使用

- 新建页面、卡片、按钮、表单、弹窗。
- 调整颜色、间距、字号、圆角、动效。
- 觉得“这里加个渐变会更好看”的时候。

## 前置

1. 读 @@DESIGN.md@@。它是唯一视觉事实源，不要凭记忆或参考图改。
2. 读 @@src/renderer/src/styles/tokens.css@@。组件只允许 @@var(--...)@@。
3. 若规格里没有你要的组件，先补规格，再写代码。

## 步骤

1. 在 @@DESIGN.md@@ 里找到对应组件或页面章节；找不到就先加一节。
2. 选择已有 token：表面、文字、强调、语义、间距、圆角、时长。
3. 写组件时按规格实现所有状态：default / hover / active / focus-visible / disabled / loading / empty / error。
4. 检查响应式：< 1180px、< 980px 的折叠行为。
5. 跑 @@npm run check:design@@；任何裸 @@#hex@@、@@rgb()@@、@@rgba()@@ 都必须改成 token。
6. 跑 @@npm run smoke@@，检查 @@artifacts/smoke/control.png@@ 与 @@overlay.png@@。
7. 与 @@DESIGN.md@@ 不一致就改代码，不改规格；除非规格本身有问题，那就先改规格并记录原因。

## 硬性规则

- 青柠只用于主操作、当前状态、结果数字；一屏一个主操作区域。
- 不用渐变文字、紫色 SaaS 渐变、彩色玻璃卡片。
- 卡片无投影；浮层和弹窗才允许阴影。
- 组件里不写死颜色、字体、圆角、间距；全部用 token。
- 例外必须写 @@/* design-exception: 原因 */@@，并在 @@DESIGN.md@@ 登记。
- 结果弹窗与控制台是两套表面规则，不混用。

## 验收

- [ ] @@npm run check:design@@ 通过。
- [ ] 所有交互状态都有视觉反馈，focus ring 可见。
- [ ] 数字使用等宽 + tabular-nums。
- [ ] 空状态有下一步动作。
- [ ] 截图里没有第二个青柠主按钮。
- [ ] 125% / 150% 缩放下没有截断。
