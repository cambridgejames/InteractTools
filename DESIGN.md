---
version: 1.0
name: 1017-Interact-Studio
description: >-
  1017 互动工坊的唯一视觉规格。深夜直播控制台：近黑画布、细发丝边框、单一酸性青柠强调色，
  以及只在结果弹窗出现的电影感舞台光。参考 Raycast 的表面阶梯、Linear 的强调色纪律、
  Warp 的克制 CTA、ElevenLabs 的暗色编辑感与 Vercel 的等宽标签，但不复制任何品牌。
colors:
  canvas: "#08090b"
  canvas-elevated: "#0b0d10"
  surface: "#111317"
  surface-hover: "#15181d"
  surface-active: "#1a1e24"
  inset: "#0d0f12"
  hairline: "#23272e"
  hairline-strong: "#323841"
  ink: "#f2f4f1"
  body: "#c4c9c2"
  mute: "#8a9188"
  faint: "#5c635b"
  accent: "#c8ff3d"
  accent-strong: "#dcff7a"
  accent-ink: "#0a0c08"
  accent-soft: "rgba(200, 255, 61, 0.12)"
  info: "#64d8ff"
  bilibili: "#fb7299"
  success: "#3ddc97"
  warning: "#f5b544"
  danger: "#ff6b6b"
  overlay-veil: "rgba(8, 9, 11, 0.82)"
typography:
  display:
    fontFamily: Inter, "Segoe UI", "SF Pro Display", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 40px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: -1.2px
  page-title:
    fontFamily: Inter, "Segoe UI", "SF Pro Display", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.4px
  card-title:
    fontFamily: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: -0.1px
  body:
    fontFamily: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0
  body-strong:
    fontFamily: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 20px
  caption:
    fontFamily: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei UI", sans-serif
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.8px
  numeric:
    fontFamily: "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0
  numeric-display:
    fontFamily: "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace
    fontSize: 96px
    fontWeight: 700
    lineHeight: 96px
    letterSpacing: -4px
---

# 1017 互动工坊 · 界面风格规格 v1.0

> 本文件是**唯一视觉事实源**。任何页面、组件、弹窗、截图验收都以它为准。
> 配色 token 落在 `src/renderer/src/styles/tokens.css`；组件里只允许引用变量，不允许写死颜色。
> 要改风格，先改本文件，再改 token，最后改组件。没有例外流程的「临时好看」一律视为 bug。

## 0. 风格坐标

五个关键词：**深夜、克制、精密、舞台感、可读**。

| 参考 | 拿什么 | 不拿什么 |
| --- | --- | --- |
| Raycast | 近黑画布、表面阶梯、1px 发丝边框、单色 CTA | 红色品牌渐变、营销页大标题 |
| Linear | 强调色纪律、密集但安静的技术排版 | 薰衣草紫品牌色、产品截图堆叠 |
| Warp | 克制的 CTA、紧凑的圆角与间距 | 暖棕炭底色、衬线标题 |
| ElevenLabs | 结果弹窗的电影感、留白与暗色编辑感 | 米白画布、粉彩光球 |
| Vercel | 等宽标签、精确的字距 | 黑白高对比营销页、网格背景 |

控制台是**工具**，结果弹窗是**舞台**。两者的表面规则不混用：控制台不发光，弹窗不堆控件。

## 1. 颜色

### 1.1 表面阶梯

| CSS 变量 | 值 | 用途 |
| --- | --- | --- |
| `--canvas` | `#08090b` | 应用最底层 |
| `--canvas-elevated` | `#0b0d10` | 侧边栏、顶栏 |
| `--surface` | `#111317` | 卡片默认 |
| `--surface-hover` | `#15181d` | 卡片/列表悬停 |
| `--surface-active` | `#1a1e24` | 选中项、按下态 |
| `--inset` | `#0d0f12` | 输入框、凹槽、代码块 |
| `--hairline` | `#23272e` | 1px 分隔线、卡片边框 |
| `--hairline-strong` | `#323841` | 需要强调的边框 |

规则：

- 不用纯黑 `#000` 做大面积背景；不用亮于 `#1f242b` 的表面。
- 层级靠「1px 边框 + 相邻表面亮度差」，不靠投影。
- 同一屏最多出现 4 级表面；超过说明布局在堆盒子。

### 1.2 文本

| CSS 变量 | 值 | 用途 |
| --- | --- | --- |
| `--ink` | `#f2f4f1` | 标题、关键数字 |
| `--body` | `#c4c9c2` | 正文 |
| `--mute` | `#8a9188` | 次要说明、时间 |
| `--faint` | `#5c635b` | 占位符、禁用、分隔文字 |

正文对比度 ≥ 4.5:1；`--faint` 不用于关键信息。

### 1.3 强调与语义

| CSS 变量 | 值 | 用途 |
| --- | --- | --- |
| `--accent` | `#c8ff3d` | 主按钮、当前状态、倒计时进度、结果数字 |
| `--accent-strong` | `#dcff7a` | 主按钮悬停 |
| `--accent-ink` | `#0a0c08` | 青柠底上的文字 |
| `--accent-soft` | `rgba(200,255,61,0.12)` | focus ring、选中底 |
| `--info` | `#64d8ff` | 连接中、链接、次要数据 |
| `--bilibili` | `#fb7299` | 仅 B站平台标识 |
| `--success` | `#3ddc97` | 已连接、成功 |
| `--warning` | `#f5b544` | 警告、未停稳 |
| `--danger` | `#ff6b6b` | 错误、危险操作 |

纪律：

- 一屏只允许一个青柠主操作区域。出现第二个时，降级为次按钮或 `--body`。
- 青柠不做正文、不做大卡片背景、不做渐变文字。
- B站粉与青柠不同时出现在一个按钮里。
- 语义色只表达状态，不做装饰。

## 2. 字体

### 2.1 字体栈

- UI：`Inter, "Segoe UI", "SF Pro Display", "PingFang SC", "Microsoft YaHei UI", sans-serif`
- 数字/代码：` "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace `
- 只用这两套。新增字体必须改本文件。

### 2.2 字号阶梯

| 角色 | 字号/行高 | 字重 | 字距 | 用途 |
| --- | --- | --- | --- | --- |
| Display | 40/44 | 600 | -1.2px | 结果数字、空状态大标题 |
| Page title | 24/32 | 600 | -0.4px | 页面标题 |
| Card title | 15/22 | 600 | -0.1px | 卡片标题 |
| Body | 13/20 | 400 | 0 | 正文、列表 |
| Body strong | 13/20 | 500 | 0 | 名字、强调 |
| Caption | 11/16 | 500 | 0.8px | 大写标签、时间、单位 |
| Numeric | 14/20 | 500 | 0 | 力量值、点数 |
| Numeric display | 96/96 | 700 | -4px | 弹窗结果 |

规则：

- 数字一律 `font-variant-numeric: tabular-nums`，倒计时和力量值不能因字宽跳动。
- 中文正文最小 12px；11px 只用于大写英文标签和时间。
- 不用斜体强调；用颜色、字重、表面层级。
- 中文段落行高不低于 1.5；单行标题可以 1.3。

## 3. 间距、栅格、布局

### 3.1 间距

4px 基数：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`。

| Token | 值 | 典型用途 |
| --- | --- | --- |
| `--s-1` | 4px | 图标与文字、标签内 |
| `--s-2` | 8px | 行内组、按钮图标 |
| `--s-3` | 12px | 表单行、列表内 |
| `--s-4` | 16px | 卡片内容组 |
| `--s-5` | 20px | 卡片内边距、卡片间距 |
| `--s-6` | 24px | 标题与内容 |
| `--s-7` | 32px | 页面区块 |
| `--s-8` | 40px | 页面大区块 |

### 3.2 窗口

- 默认 1320 × 860；最小 1120 × 720。
- 侧边栏 216px；顶栏 64px；内容区左右 padding 28px，顶部 24px。
- 内容最大宽度 1440px；更宽时居中，不让卡片无限拉伸。
- 页面滚动只发生在内容区，侧边栏与顶栏固定。

### 3.3 页面骨架

| 页面 | 栅格 |
| --- | --- |
| 控制台 | 12 列：主操作卡 8 列，事件流 4 列；历史记录通栏 |
| 工具 | 3 列等宽卡片；< 1180px 变 2 列 |
| 平台 | 2 列；< 1180px 单列 |
| 设置 | 单列，最大 720px |

- 卡片间距 20px；同一行卡片等高。
- 卡片内不嵌套卡片；需要分组时用 1px 分隔线 + 16px 间距。
- 页面标题区：标题 24px，右侧最多一个主操作；副标题 12px `--mute`，与标题间距 4px。

## 4. 圆角、边框、阴影

| Token | 值 | 用途 |
| --- | --- | --- |
| `--r-chip` | 999px | 状态胶囊、标签 |
| `--r-control` | 10px | 按钮、输入框、下拉 |
| `--r-card` | 14px | 卡片 |
| `--r-overlay` | 20px | 结果弹窗 |
| `--r-icon` | 12px | 图标底板 |

- 边框统一 1px；选中态用 1px 青柠 40%，不用 2px 粗边。
- 控制台卡片无投影。
- 浮层阴影：`0 12px 32px rgba(0,0,0,0.45)`。
- 弹窗阴影：`0 32px 80px rgba(0,0,0,0.6)`。
- 发光只给结果数字与倒计时环：`0 0 32px rgba(200,255,61,0.18)`。

## 5. 组件规格

### 5.1 侧边栏

- 背景 `--canvas-elevated`，右侧 1px `--hairline`。
- 品牌区高 72px：32px 青柠圆角方块（内含黑色「1017」小字）+ 右侧「1017」15px/600 + 「互动工坊」11px `--mute`。
- 导航项高 40px，圆角 8px，左 padding 12px，图标 18px，文字 13px。
- 默认：透明底，`--mute`；悬停：`--surface-hover`，`--body`；选中：`--surface-active`，`--ink`，左侧 2px 青柠指示条（距左 0，高 16px）。
- 底部固定：版本号 11px `--faint`；「数据目录」文字按钮。

### 5.2 按钮

| 类型 | 高度 | 内边距 | 背景 | 文字 | 边框 |
| --- | --- | --- | --- | --- | --- |
| Primary | 36px | 0 16px | `--accent` | `--accent-ink` | 无 |
| Secondary | 36px | 0 14px | 透明 | `--body` | 1px `--hairline-strong` |
| Ghost | 32px | 0 10px | 透明 | `--mute` | 无 |
| Danger | 32px | 0 10px | 透明 | `--danger` | 无 |
| Icon | 32×32 | 0 | 透明 | `--mute` | 无 |

状态：

- Hover：Primary → `--accent-strong`；Secondary → `--surface-hover`；Ghost → `--surface`。
- Active：`transform: scale(0.98)`。
- Focus-visible：`0 0 0 3px var(--accent-soft)`，始终可见。
- Disabled：`opacity: 0.4`，`cursor: not-allowed`，不改变尺寸。
- Loading：文字换成「处理中…」，保留宽度，禁止重复点击。

按钮文案 2–6 个汉字，动词开头：开始收集、取消、预览弹窗、重新连接、保存设置。

### 5.3 输入框 / 下拉 / 开关

- 高 38px，`--inset` 底，1px `--hairline`，10px 圆角，padding 0 12px，13px 字。
- Placeholder `--faint`。
- Focus：边框 `rgba(200,255,61,0.6)` + 3px `--accent-soft` ring。
- Error：边框 `--danger`，下方 12px 错误文案，`--danger`。
- 下拉：右侧 14px chevron，`--mute`；菜单背景 `--surface-active`，1px `--hairline-strong`，阴影浮层。
- 开关：36×20，关闭 `--surface-active`，开启 `--accent`；旋钮 16px，`--accent-ink` 或 `--ink`；过渡 160ms。
- 表单行：label 12px `--mute`，控件与 label 间距 6px，行间距 16px。

### 5.4 卡片

- `--surface` 底，1px `--hairline`，14px 圆角，padding 20px。
- 标题行：左 15px/600，右侧状态或一个 Ghost 操作；标题与内容间距 16px。
- 卡片悬停：只在可点击时变 `--surface-hover`；静态卡片不响应悬停。
- 卡片内数字用 Numeric；说明用 12px `--mute`。

### 5.5 状态胶囊

- 高 24px，padding 0 10px，999px 圆角，11px/500。
- 圆点 6px，距文字 6px。
- 已连接：`--success` 点 + 10% 底；连接中：`--info` 点 + 1.2s 脉冲；重连：`--warning`；异常：`--danger`；未连接：`--faint`。
- 胶囊内文字固定：已连接 / 连接中 / 重连中 / 异常 / 未连接。

### 5.6 倒计时环

- 直径 180px，轨道 8px `--hairline`，进度 8px `--accent`，圆头。
- 中心：40px Numeric 秒数 + 11px `--mute`「剩余」。
- 最后 5 秒：进度变 `--warning`，数字同步变警告色；不做缩放抖动。
- 结束后环淡出 180ms，换成结果数字；不保留残影。

### 5.7 参与者列表

- 行高 40px；头像 24px 圆形，底色 `--surface-active`，首字 11px `--body`。
- 名字 13px `--body`，超出省略；力量值右对齐 Numeric 14px `--ink`。
- 力量条：56×4px，底 `--hairline`，填充 `--accent`，按 0–100 映射。
- 最新投票行淡入 180ms；不排序跳动，按首次参与顺序。

### 5.8 事件流

- 行最小高 44px，垂直 padding 8px；头像 24px。
- 名字 13px/600 `--body`；内容 13px `--body`；时间 11px Numeric `--faint` 右对齐。
- 系统消息：左侧 2px `--accent` 条，文字 `--body`。
- 礼物：左条 `--bilibili`，礼物名 `--bilibili`。
- 进场：文字 `--mute`。
- 新消息从底部进入，列表自动滚到底部，除非用户向上滚动超过 48px。

### 5.9 工具卡片

- 3 列；图标底板 36×36，12px 圆角，`--surface-active`，图标 18px `--accent`。
- 标题 15px/600，描述 12px/18 `--mute`，最多两行。
- 底部：状态胶囊 + 「配置」Ghost 按钮。
- 未启用工具：整体 60% 透明度，右上角「即将推出」胶囊。

### 5.10 历史记录

- 表头 11px 大写 `--mute`，行高 36px。
- 列：时间 / 骰子 / 力度 / 结果 / 聚合方式。
- 结果列 Numeric 14px `--ink`；未停稳在结果旁加 11px 警告点。
- 空状态：居中 32px 图标、14px 标题、12px 说明、一个 Secondary 按钮。

### 5.11 Toast

- 右下角，宽 320px，`--surface-active` 底，1px `--hairline-strong`，14px 圆角，padding 12px 16px，阴影浮层。
- 成功/错误左侧 2px 语义色；3 秒自动消失；不遮挡主操作。

### 5.12 结果弹窗（Overlay）

窗口 1080×680，透明；卡片 1000×600，`--overlay-veil` + `backdrop-filter: blur(18px)`，1px `rgba(255,255,255,0.08)`，20px 圆角，弹窗阴影。

布局：左 620px 3D 舞台，右 340px 信息区，内边距 40px；中间 20px 间距。

舞台：

- 圆形台面半径 4.2，`--surface` 到 `--canvas` 的径向渐变；外环 2px `rgba(200,255,61,0.35)`。
- 顶光 + 侧逆光；骰子投影真实落地，阴影不透明度 0.35。
- 相机固定，不环绕；骰子从画面上方落入。

信息区：

- 顶部 11px/500 `--mute` 大写标签：`DICE / D20`。
- 结果数字 96px Numeric Display `--accent`，带 32px 柔光；下方 11px `--mute`「点数」。
- 三行数据：参与人数、力度、聚合方式；行高 28px，label 11px `--mute`，value 14px Numeric `--ink`。
- 力度条：160×4，底 `--hairline`，填充 `--accent`。
- 底部：自动关闭进度条 2px `--accent`，从左到右 12 秒；旁边 11px `--faint`「结果窗口将自动关闭」。
- 投掷中：结果位置显示 32px `--mute`「投掷中…」，数字出现时从 0 滚到最终值 320ms。
- 彩带：只在结果出现时喷一次，1.2 秒结束；颜色只用 `--accent` / `--info` / `--bilibili`，密度低。
- 透明窗口外部完全透明；不铺全屏黑色遮罩。

## 6. 动效

| Token | 值 | 用途 |
| --- | --- | --- |
| `--dur-fast` | 120ms | 悬停、按下 |
| `--dur-base` | 180ms | 淡入、状态切换 |
| `--dur-result` | 320ms | 结果数字滚动 |
| `--ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | 所有进入 |

- 只动 `transform / opacity / background-color`；不动宽高、top/left、margin。
- 不做无限循环装饰动画；连接中圆点脉冲除外。
- `prefers-reduced-motion: reduce` 时：关闭彩带、数字滚动、脉冲，只保留 120ms 淡入。

## 7. 文案

- 动词开头，2–6 字：开始收集、取消、预览弹窗、重新连接、保存设置。
- 不用感叹号、不用「哦/啦/呢」、不用营销词。
- 空状态 = 标题 + 一句下一步，不只写「暂无数据」。
  - 例：标题「还没有投掷记录」，说明「开始一轮，结果会留在这里」，按钮「开始收集」。
- 错误 = 发生了什么 + 下一步。
  - 例：「房间号为空。先填写直播间房间号，再连接。」
- 数字与单位分开：`12 秒`、`80 点`、`6 人`；英文标签全大写 `LIVE / DICE`。

## 8. 可访问性

- 正文对比度 ≥ 4.5:1；大字 ≥ 3:1。
- 所有交互元素有可见 focus ring；键盘 Tab 顺序与视觉顺序一致。
- 图标按钮必须有 `aria-label`；状态变化用 `aria-live="polite"`。
- 点击目标最小 36×36px。
- 倒计时与结果数字用 `tabular-nums`；不要只靠颜色表达状态，配合文字。
- 支持 125% / 150% Windows 缩放：文字不截断，卡片可换行。

## 9. Do / Don't

### Do

- 用表面阶梯和 1px 边框建立层级。
- 青柠只给主操作、当前状态、结果数字。
- 数字用等宽字体；标签用 11px 大写。
- 空状态给下一步动作。
- 截图验收时同时看控制台和弹窗。

### Don't

- 不要紫色 SaaS 渐变、渐变文字、彩色玻璃卡片。
- 不要给每张卡片加投影或发光。
- 不要超过两套字体。
- 不要在控制台放循环动画。
- 不要用 B站粉 + 青柠做同一个按钮。
- 不要在组件里写死 `#hex` / `rgb()` / 新字体 / 新圆角。

## 10. 强制执行

1. **唯一 token 文件**：`src/renderer/src/styles/tokens.css`。组件只允许 `var(--...)`。
2. **自动检查**：`npm run check:design` 扫描 `.vue` 的 `<style>` 与 `.css`，发现裸颜色即失败。
3. **例外**：仅允许在同行写 `/* design-exception: 原因 */`，并在本文件登记原因；否则视为违规。
4. **新增组件**：先在本文件补规格（尺寸、状态、颜色 token），再写代码。
5. **验收**：`npm run smoke` 后检查 `artifacts/smoke/control.png` 与 `overlay.png`；视觉不对就不算完成。
6. **变更顺序**：本文件 → `tokens.css` → 组件 → 截图。禁止反过来。

## 11. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| 1.0 | 2026-10-18 | 首版：控制台 + 结果弹窗完整规格 |
