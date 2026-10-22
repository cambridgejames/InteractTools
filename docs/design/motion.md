# 动效规范

参考 `D:AProjectOthersskills` 的 animate / review-animations / animation-performance 规则整理。当前只定义规范，**不在本轮实现新动效**。

## 原则

1. 动效只解释状态变化，不做装饰循环。
2. 进入用 ease-out，退出更快；不使用线性缓动表达 UI 状态。
3. 只动画 `transform` 和 `opacity`；不改 width/height/top/left 触发布局。
4. 可打断：悬停、点击、窗口缩放时不能等动画播完才响应。
5. 高频操作（弹幕、滚动、发送）不加重动画；入场/退场控制在 120–180ms。
6. 尊重 `prefers-reduced-motion`：关闭位移和缩放，只留淡入淡出。

## 时长 / 曲线

| 场景 | 时长 | 曲线 |
| --- | --- | --- |
| 控件状态、淡入 | 120ms | var(--ease-out) |
| 面板/卡片进入 | 180ms | var(--ease-out) |
| 结果弹窗 | 320ms | var(--ease-out) |
| 退出 | 120ms | ease-in |

## 禁止

- 弹幕列表逐条入场动画、无限呼吸/漂浮、自动轮播。
- 用 scale(0) 作为默认进入状态；从 0.96 开始。
- 在滚动容器里对每一条消息加 transition。
