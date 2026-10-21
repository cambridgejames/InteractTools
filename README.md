# 互动工坊

[![Verify](https://github.com/cambridgejames/InteractTools/actions/workflows/verify.yml/badge.svg)](https://github.com/cambridgejames/InteractTools/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8ff3d.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.12-339933.svg)](package.json)

[English overview](README.en.md)

<img src="build/icon.png" alt="互动工坊图标" width="96" />

直播间弹幕互动工具集，Electron 桌面应用。多平台统一接入，玩法以工具插件扩展。

目前包含「投骰子」「转转盘」「弹幕投票」三个工具。

投骰子：

- 观众发送 `!力度 80` 设置力度；同一观众只取最后一条。
- 倒计时结束后按中位数聚合力度（可切换均值 / 截尾均值）。
- 用 cannon-es 做真实刚体模拟，骰子从中央发射台向上弹射，力度决定上冲速度和自旋，镜头随高度推拉；中高力度会二次弹跳和横向咕噜，d6 有圆角倒角。右侧合力表实时显示力度；主操作区常驻「收集力度 / 直接投掷」，直接投掷使用随机 0–100 力度。
- 动画在工具面板内就地播放：骰子 3D 舞台、转盘原地旋转；停稳后再弹应用内结果弹窗，带彩带烟花，手动关闭，OBS 直接采集控制台窗口即可。
- 第二个工具是「转转盘」：**主播手动触发，没有弹幕命令**，用于抽奖、选品和现场决策；选项直接写在扇形上并跟着转，中心图标做指针。落点在选中扇区内随机偏移，并随机使用滑步或急停收尾，不再每次都停在正中间。
- 第三个工具是「弹幕投票」：观众发 `!投票 1` 或选项文字；默认同一观众只计第一票，可开启「允许改票」改为后票覆盖；大倒计时结束后统计并列最高票并弹出结果。
- 控制台是通用工具宿主：顶部工具切换器按 manifest 自动出现，三个工具共用同一套平台、历史、面板动画与应用内结果弹窗基础设施。
- 右侧实时弹幕栏可完整显示、折叠成窄条或隐藏，使用虚拟滚动固定行高并保持贴底；窗口小于 1180px 时优先让出中间工具区。
- 设置页提供网络代理：直连（默认）/ 系统代理 / 自定义 HTTP(S) 代理，可测试 B站连通性；B站接口与弹幕 WebSocket 都走同一代理。
- 「互动工具」页的卡片内可以单独开关投骰子、转转盘或弹幕投票；关闭后不接收弹幕命令，重新打开恢复配置与历史。
- 「互动工具」页支持名称/描述/命令/关键词的模糊搜索，也支持拼音和首字母；多个关键词与中文分词、命中高亮、相关度排序。
- 模拟源通过命令提示发布订阅工作：没有工具收集时只发普通聊天，收集时才注入当前工具的命令；测试命令 chip 在工具面板顶部。

## 快速开始

```bash
npm install
npm run dev
```

默认会自动连接「本地模拟」。打开控制台 → 开始收集 → 在右侧弹幕面板发送 `!力度 80`，即可看到完整流程。详见 [docs/usage.md](docs/usage.md)。

## 当前状态

可运行原型：控制台、本地模拟、B站匿名适配器、骰子、转转盘、弹幕投票、真实物理、面板内动画、应用内结果弹窗 + 彩带烟花、可折叠/隐藏弹幕栏、工具预设、多显示器窗口位置、冒烟截图，以及 Windows / macOS / Linux 的 x64 + arm64 打包配置。

B站弹幕已通过 WBI 签名 + WSS 认证真连：房间 6、21144080 均可连接，弹幕条数随房间活跃度变化。连接后状态会显示「直播中 / 轮播 / 未开播」；未开播时连接仍在，只是不会收到新弹幕。`-352` 会自动刷新 WBI 密钥重试一次。

## 文档

- [DESIGN.md](DESIGN.md) — 唯一视觉规格
- [AGENTS.md](AGENTS.md) — 协作规范与架构不变量
- [docs/architecture.md](docs/architecture.md) — 分层、契约、数据流
- [docs/architecture-report.md](docs/architecture-report.md) — 完整架构报告（含全量数据流）
- [docs/usage.md](docs/usage.md) — 使用与 OBS 配置
- [docs/roadmap.md](docs/roadmap.md) — 进度
- [docs/testing.md](docs/testing.md) — 测试策略
- [docs/verification.md](docs/verification.md) — 实机验证记录
- [CONTRIBUTING.md](CONTRIBUTING.md) — 贡献流程与自检
- [CHANGELOG.md](CHANGELOG.md) — 版本变更
- [SECURITY.md](SECURITY.md) — 安全问题与安全模型
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — 行为准则

## 命令

```bash
npm run dev          # 开发模式
npm run typecheck    # 类型检查
npm run lint         # ESLint + 依赖边界 + 设计 token
npm run test         # Vitest
npm run build        # 构建
npm run smoke        # 启动 Electron 并截图到 artifacts/smoke
npm run package:win  # Windows x64 + arm64（NSIS / portable）
npm run package:mac  # macOS x64 + arm64（dmg / zip）
npm run package:linux # Linux x64 + arm64（AppImage / deb）
```

## 参与贡献

欢迎 Issue 和 PR。开始前请读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [AGENTS.md](AGENTS.md)；安全问题请走私密报告，不要开公开 Issue。

## 目录

```
src/contracts   公共契约（类型 + zod）
src/kernel      平台无关内核
src/platforms   B站 / 本地模拟
src/tools       互动工具（dice / wheel / vote）
src/main        Electron 组合根与 Surface
src/renderer    控制台、面板内动画与应用内结果弹窗
```
