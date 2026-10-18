# 验证记录

- 日期：2026-10-18
- 验证时代码：WBI 修复后的工作区（见 `git log`）
- 环境：Windows 10.0.26200 / Node 24.19 / Electron 44.9.0 / electron-vite 6.0.0

## 自动检查

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 通过 |
| 静态检查 | `npm run lint` | 通过（ESLint + 依赖边界 + 设计 token） |
| 单元测试 | `npm run test` | 通过，7 个文件 / 31 个用例（另 1 个真连测试默认跳过） |
| 构建 | `npm run build` | 通过 |
| 冒烟 | `npm run smoke` | 通过，生成控制台与 overlay 截图 |
| 打包 | `npm run package:win` | 通过，NSIS + portable |
| 打包后冒烟 | `release/win-unpacked/1017 互动工坊.exe --smoke` | 通过，进程正常退出 |
| B站真连 | `LIVE_BILIBILI=1 npx vitest run tests/bilibili-live.test.ts` | 通过，房间 21144080，8 秒 16 条弹幕 |

## 冒烟截图

本地生成在 `artifacts/smoke/`，未入库：

- `control.png`：控制台，含平台状态、骰子面板、事件流、历史记录。
- `overlay-rolling.png`：骰子结果窗投掷中。
- `overlay.png`：骰子结果窗停稳，点数与骰子朝上面一致。
- `control-wheel.png`：通用工具切换器选中转转盘。
- `overlay-wheel-spinning.png` / `overlay-wheel.png`：转盘旋转中与停稳。

## 打包产物

- `release/1017-Interact-Studio-0.1.0-setup.exe`
- `release/1017-Interact-Studio-0.1.0-portable.exe`

## 覆盖范围

- 基础设施：AGENTS.md、DESIGN.md、docs、ADR、4 个 agent skill、CI。
- 平台层：统一 `PlatformAdapter`，本地模拟 + B站匿名弹幕（WBI 签名），协议 fixture 与真连测试。
- 工具层：统一 `InteractionTool`，投骰子（命令驱动）与转转盘（主播手动）两种形态，历史记录分开。
- 控制台：通用工具切换器按 manifest 渲染，骰子/转盘面板分离；转盘不经过 CommandBus。
- 物理：六种面数、凸包、cannon-es 固定步长、停稳判定、d4 读底面。
- 呈现：主进程录制帧，overlay 回放 Three.js，透明置顶窗。
- 配置：zod 校验、原子写、坏配置回落。
- 设计：DESIGN.md 规格 + tokens.css + `check:design` 强制。

## 已知限制

1. B站真连已通过 WBI 签名验证；若特定网络仍返回 `-352`，可能是网络/风控，不一定是签名问题。
2. d10 使用五角双锥，而非标准五角偏方面体。
3. OBS 窗口捕获尚未在 OBS 内实测；截图确认透明通道存在。
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
