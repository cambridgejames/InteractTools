# 1017 互动工坊

直播间弹幕互动工具集，Electron 桌面应用。多平台统一接入，玩法以工具插件扩展。

第一个工具是「投骰子」：

- 观众发送 `!力度 80` 设置力度；同一观众只取最后一条。
- 倒计时结束后按中位数聚合力度（可切换均值 / 截尾均值）。
- 用 cannon-es 做真实刚体模拟，骰子滚动、碰撞、停稳后读取朝上一面。
- 独立透明窗口播放 3D 结果，OBS 窗口捕获即可上直播。

## 快速开始

```bash
npm install
npm run dev
```

默认会自动连接「本地模拟」。打开控制台 → 开始收集 → 在右侧弹幕面板发送 `!力度 80`，即可看到完整流程。详见 [docs/usage.md](docs/usage.md)。

## 当前状态

可运行原型：控制台、本地模拟、B站匿名适配器、骰子领域、真实物理、3D 结果弹窗、冒烟截图、Windows 打包配置。

B站匿名接口在部分网络会返回 `-352` 风控；此时 UI 会明确提示，本地模拟不受影响。

## 文档

- [DESIGN.md](DESIGN.md) — 唯一视觉规格
- [AGENTS.md](AGENTS.md) — 协作规范与架构不变量
- [docs/architecture.md](docs/architecture.md) — 分层、契约、数据流
- [docs/usage.md](docs/usage.md) — 使用与 OBS 配置
- [docs/roadmap.md](docs/roadmap.md) — 进度
- [docs/testing.md](docs/testing.md) — 测试策略

## 命令

```bash
npm run dev          # 开发模式
npm run typecheck    # 类型检查
npm run lint         # ESLint + 依赖边界 + 设计 token
npm run test         # Vitest
npm run build        # 构建
npm run smoke        # 启动 Electron 并截图到 artifacts/smoke
npm run package:win  # Windows 安装包
```

## 目录

```
src/contracts   公共契约（类型 + zod）
src/kernel      平台无关内核
src/platforms   B站 / 本地模拟
src/tools       互动工具（当前：dice）
src/main        Electron 组合根与 Surface
src/renderer    控制台与结果弹窗
```
