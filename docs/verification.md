# 验证记录

- 日期：2026-10-18
- 验证时代码：WBI 修复后的工作区（见 `git log`）
- 环境：Windows 10.0.26200 / Node 24.19 / Electron 44.9.0 / electron-vite 6.0.0

## 自动检查

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 通过 |
| 静态检查 | `npm run lint` | 通过（ESLint + 依赖边界 + 设计 token） |
| 单元测试 | `npm run test` | 通过，12 个文件 / 42 个用例（另 1 个真连测试默认跳过） |
| 构建 | `npm run build` | 通过 |
| 冒烟 | `npm run smoke` | 通过，生成控制台面板动画与应用内结果弹窗截图 |
| 打包 | `npm run package:win` | 通过，NSIS + portable |
| 打包后冒烟 | `release/win-unpacked/互动工坊.exe --smoke` | 通过，进程正常退出 |
| B站真连 | `LIVE_BILIBILI=1 npx vitest run tests/bilibili-live.test.ts` | 通过，房间 6 / 21144080 可认证；弹幕数随房间活跃度变化，最近一次房间 6 收到 2 条 |

## 冒烟截图

本地生成在 `artifacts/smoke/`，未入库：

- `control.png`：控制台，含平台状态、骰子面板、事件流、历史记录。
- `control-wheel.png`：转盘扇形标签、中心指针和命名预设列表。
- `control-platforms.png`：平台设置页仍保留右侧实时弹幕栏。
- `control-settings.png`：窗口位置、弹幕栏模式、结果展示与 GitHub 入口。
- `control-settings-about.png`：关于区的 GitHub 仓库/问题反馈入口。
- `control-feed-collapsed.png` / `control-feed-hidden.png`：弹幕栏折叠窄条与隐藏。
- `control-vote.png` / `control-vote-collecting.png`：投票面板待开始（含预设）与投票中大倒计时。
- `control-vote-result.png`：应用内投票结果弹窗（票数与并列最高）。
- `control-dice-rolling.png`：骰子从发射台上升、镜头跟随中。
- `control-dice-100.png`：100 力度直接投掷，骰子接近画面上沿。
- `control-wheel-rolling.png`：转盘面板内原地旋转中。
- `control-dice-result.png` / `control-wheel-result.png`：应用内骰子/转盘结果弹窗 + 彩带烟花。

## 打包产物

- `release/Interact-Studio-0.1.0-setup.exe`
- `release/Interact-Studio-0.1.0-portable.exe`

## 覆盖范围

- 基础设施：AGENTS.md、DESIGN.md、docs、ADR、4 个 agent skill、CI。
- 平台层：统一 `PlatformAdapter`，本地模拟 + B站匿名弹幕（WBI 签名），协议 fixture 与真连测试。
- 工具层：统一 `InteractionTool`，投骰子（命令驱动）、转转盘（主播手动）、弹幕投票（命令驱动）三种形态，历史记录分开。
- 控制台：通用工具切换器按 manifest 渲染，骰子/转盘面板分离；转盘不经过 CommandBus；转盘/投票各支持最多 12 个命名预设。
- 物理：六种面数、凸包、cannon-es 固定步长、停稳判定、d4 读底面；支持直接投掷（兜底力度、跳过收集）。
- 呈现：主进程录制帧，骰子在 `DicePanel` 内联 Three.js 回放，转盘在 `WheelPanel` 内 CSS 旋转；停稳后在控制台内弹出 `ResultOverlay` + 彩带烟花，手动关闭。
- 配置：面板 500ms / 平台 600ms debounce 自动保存；feed 使用 68px 行高虚拟滚动并保持贴底。
- 配置：zod 校验、原子写、坏配置回落。
- 设计：DESIGN.md 规格 + tokens.css + `check:design` 强制。

## 已知限制

1. B站真连已通过 WBI 签名验证；未开播/轮播房间连接成功但 0 弹幕属正常，状态栏会显示房间状态。若特定网络仍返回 `-352`，适配器会刷新密钥重试一次。
2. d10 使用五角双锥，而非标准五角偏方面体。
3. 结果弹窗已在控制台窗口内，OBS 直接采集控制台即可；尚未在真实 OBS 内实测。
4. NSIS 安装包已构建，但未走完整安装向导点击验证。

## 复现

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run smoke
npm run package:win
```

如果 Electron 被宿主以 `ELECTRON_RUN_AS_NODE=1` 启动，使用 `npm run smoke`（内置启动器会清理该变量），或先手动清除环境变量。
