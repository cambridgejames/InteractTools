# 1017 互动工坊

直播间弹幕互动工具集，Electron 桌面应用。多平台统一接入，玩法以工具插件扩展。

第一个工具是「投骰子」：

- 观众发送 `!力度 80` 设置力度；同一观众只取最后一条。
- 倒计时结束后按中位数聚合力度（可切换均值 / 截尾均值）。
- 用 cannon-es 做真实刚体模拟，骰子滚动、碰撞、停稳后读取朝上一面。
- 独立透明窗口播放 3D 结果，OBS 窗口捕获即可上直播。

## 当前状态

基础设施与工程骨架阶段。架构与规范见：

- [AGENTS.md](AGENTS.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/roadmap.md](docs/roadmap.md)

## 开发

```bash
npm install
npm run dev
```

常用命令见 AGENTS.md 第 3 节。

## 目录

```
src/contracts   公共契约（类型 + zod）
src/kernel      平台无关内核
src/platforms   B站 / 本地模拟
src/tools       互动工具（当前：dice）
src/main        Electron 组合根与 Surface
src/renderer    控制台与结果弹窗
```
