# 1017 互动工坊

直播间弹幕互动工具集，Electron 桌面应用。多平台统一接入，玩法以工具插件扩展。

目前包含「投骰子」「转转盘」「弹幕投票」三个工具。

投骰子：

- 观众发送 `!力度 80` 设置力度；同一观众只取最后一条。
- 倒计时结束后按中位数聚合力度（可切换均值 / 截尾均值）。
- 用 cannon-es 做真实刚体模拟，骰子滚动、碰撞、停稳后读取朝上一面。
- 动画在工具面板内就地播放：骰子 3D 舞台、转盘原地旋转；停稳后再弹原生结果小窗，带彩带烟花，手动关闭。
- 第二个工具是「转转盘」：**主播手动触发，没有弹幕命令**，用于抽奖、选品和现场决策。
- 第三个工具是「弹幕投票」：观众发 `!投票 1` 或选项文字，同一观众以最后一票为准；倒计时结束统计并列最高票并弹出结果。
- 控制台是通用工具宿主：顶部工具切换器按 manifest 自动出现，三个工具共用同一套平台、历史、面板动画与结果窗基础设施。
- 右侧实时弹幕栏在所有页面常驻，调设置时也能看到观众反馈；窗口小于 1180px 时优先让出中间工具区。

## 快速开始

```bash
npm install
npm run dev
```

默认会自动连接「本地模拟」。打开控制台 → 开始收集 → 在右侧弹幕面板发送 `!力度 80`，即可看到完整流程。详见 [docs/usage.md](docs/usage.md)。

## 当前状态

可运行原型：控制台、本地模拟、B站匿名适配器、骰子、转转盘、弹幕投票、真实物理、面板内动画、原生结果窗 + 彩带烟花、冒烟截图、Windows 打包配置。

B站弹幕已通过 WBI 签名 + WSS 认证真连：房间 6、21144080 均可连接，弹幕条数随房间活跃度变化。连接后状态会显示「直播中 / 轮播 / 未开播」；未开播时连接仍在，只是不会收到新弹幕。`-352` 会自动刷新 WBI 密钥重试一次。

## 文档

- [DESIGN.md](DESIGN.md) — 唯一视觉规格
- [AGENTS.md](AGENTS.md) — 协作规范与架构不变量
- [docs/architecture.md](docs/architecture.md) — 分层、契约、数据流
- [docs/usage.md](docs/usage.md) — 使用与 OBS 配置
- [docs/roadmap.md](docs/roadmap.md) — 进度
- [docs/testing.md](docs/testing.md) — 测试策略
- [docs/verification.md](docs/verification.md) — 实机验证记录

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
src/renderer    控制台、面板内动画与原生结果窗
```
