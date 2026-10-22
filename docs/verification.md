# 验证记录

- 日期：2026-10-18
- 验证时代码：WBI 修复后的工作区（见 `git log`）
- 环境：Windows 10.0.26200 / Node 24.19 / Electron 44.9.0 / electron-vite 6.0.0

## 自动检查

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 通过 |
| 静态检查 | `npm run lint` | 通过（ESLint + 依赖边界 + 设计 token） |
| 单元测试 | `npm run test` | 通过，16 个文件 / 64 个用例；2 个真连/集成测试默认跳过 |
| 构建 | `npm run build` | 通过 |
| 冒烟 | `npm run smoke` | 通过，生成控制台面板动画与应用内结果弹窗截图 |
| 打包 | `npm run package:win` / `package:mac` / `package:linux` | Windows 本地通过 x64 + arm64；macOS/Linux 由 CI 矩阵构建 |
| 打包后冒烟 | `release/win-unpacked/互动工坊.exe --smoke` | 通过，进程正常退出 |
| B站真连 | `LIVE_BILIBILI=1 npx vitest run tests/bilibili-live.test.ts` | 通过，房间 6 / 21144080 可认证；弹幕数随房间活跃度变化，最近一次房间 6 收到 2 条 |
| 网络测试 | 设置页「测试连通性」 | 通过，直连 B站接口 128ms |

## 冒烟截图

本地生成在 `artifacts/smoke/`，未入库：

- `control.png`：控制台，含平台状态、骰子面板、事件流、历史记录。
- `control-wheel.png`：转盘扇形标签、中心指针和命名预设列表。
- `control-platforms.png`：设置页「平台连接」子页，B站、抖音、本地模拟三张独立卡片与统一位置开关。
- `control-tools.png`：互动工具页三张工具卡片、卡片内开关与搜索框。
- `control-tool-search.png`：互动工具页搜索拼音“touzi”，命中卡片、拼音高亮与相关度排序。
- `control-settings.png` / `control-settings-window.png`：外观与窗口子页；另有快捷键、数据、关于、浅色主题截图。
- `control-settings-network.png`：设置「网络」子页，代理模式与连通性测试入口。
- `control-settings-select.png`：自定义深色下拉菜单展开态。
- `control-settings-about.png`：关于区的 GitHub 仓库/问题反馈入口。
- `control-feed-collapsed.png` / `control-feed-hidden.png`：弹幕栏折叠窄条与隐藏。
- `control-vote.png` / `control-vote-collecting.png`：投票面板待开始（含预设）与投票中大倒计时。
- `control-vote-result.png`：应用内投票结果弹窗（票数与并列最高）。
- `control-dice-rolling.png`：骰子从发射台上升、镜头跟随中。
- `control-dice-direct.png`：随机力度的直接投掷。
- `control-wheel-rolling.png`：转盘面板内原地旋转中。
- `control-dice-result.png` / `control-wheel-result.png`：应用内骰子/转盘结果弹窗 + 彩带烟花。

## 打包产物

- Windows x64/arm64：`Interact-Studio-0.1.0-{arch}-setup.exe`、`-portable.exe`
- macOS x64/arm64：`Interact-Studio-0.1.0-{arch}.dmg` / `.zip`
- Linux x64/arm64：`Interact-Studio-0.1.0-{arch}.AppImage` / `.deb`

## 覆盖范围

- 基础设施：AGENTS.md、docs/design、docs/ARCHITECTURE.md、ADR、技能与文档校验、CI。
- 平台层：统一 `PlatformAdapter`，本地模拟 + B站匿名弹幕（WBI 签名）+ 抖音只读（本地签名、protobuf fixture、真实 WSS 可选测试）。
- 工具层：统一 `InteractionTool`，投骰子（命令驱动）、转转盘（主播手动）、弹幕投票（命令驱动）三种形态，历史记录分开。
- 控制台：通用工具切换器按 manifest 渲染，骰子/转盘面板分离；转盘不经过 CommandBus；转盘/投票各支持最多 12 个命名预设。
- 物理：六种面数、凸包、cannon-es 固定步长、停稳判定、d4 读底面；支持直接投掷（随机 0–100 力度、跳过收集）。
- 呈现：主进程录制帧，骰子在 `DicePanel` 内联 Three.js 回放，转盘在 `WheelPanel` 内 CSS 旋转；停稳后在控制台内弹出 `ResultOverlay` + 彩带烟花，手动关闭。
- 配置：面板 500ms / 平台 600ms debounce 自动保存；feed 使用 68px 行高虚拟滚动并保持贴底。
- 配置：zod 校验、原子写、坏配置回落。
- 设计：docs/design/ui-guidelines.md 规格 + tokens.css + `check:design` 强制。

## 已知限制

1. B站真连已通过 WBI 签名验证；未开播/轮播房间连接成功但 0 弹幕属正常，状态栏会显示房间状态。若特定网络仍返回 `-352`，适配器会刷新密钥重试一次。
2. d10 使用五角双锥，而非标准五角偏方面体。
3. 结果弹窗已在控制台窗口内，OBS 直接采集控制台即可；尚未在真实 OBS 内实测。
4. Windows x64/arm64 安装包已构建，但未走完整安装向导点击验证；macOS/Linux 产物由 CI 构建，尚未在对应实机验证。
5. 抖音本地签名和 WSS 握手已用真实房间验证；测试曾在 03:33 收到 `kind === 'chat'` 帧，但没有记录当时的文本，不能作为内容证据。测试现已要求非空 `text` 并打印 `DOUYIN_CHAT 用户名: 内容`，需用正在直播且有人发言的房间重跑。命令：`LIVE_DOUYIN_ROOM=<活跃房间号> npx vitest run tests/douyin-live.test.ts`。抖音改算法后替换 `assets/sign.js` 并发布版本。

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
