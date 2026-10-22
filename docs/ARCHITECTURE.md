# 架构说明

面向要改这个仓库的人。目录归属与代码规范见 [AGENTS.md](../AGENTS.md)；单子系统为什么是这样见 [design/](design/README.md)。

---

## 进程模型

```
┌──────────────────── 主进程（Node） ────────────────────┐
│ composition.ts   组装：配置 → 网络 → 窗口 → 内核 → IPC  │
│ kernel/          Engine / PlatformHost / ToolHost       │
│ platforms/       bilibili / douyin / mock 适配器        │
│ tools/           dice / wheel / vote 状态机              │
│ services/        配置、历史、日志、代理、快捷键           │
│ windows/         ControlWindow + ResultSurface           │
└─────────────────────────────────────────────────────────┘
          ▲ IPC（zod 校验的 invoke + 主进程推送）
          │
┌─────────┴───────────────────────────────────────────────┐
│ 渲染进程（一个控制台窗口）                               │
│ Vue 3：控制台 / 工具 / 设置 / 结果弹窗 / 弹幕栏          │
│ 只拿 preload 暴露的窄 API；不直接碰 fs、ws、electron     │
└─────────────────────────────────────────────────────────┘
```

## 分层

| 层 | 职责 | 不该出现 |
|---|---|---|
| `contracts/` | zod schema、跨层类型、IPC 名称 | 具体实现、Electron/Node API |
| `kernel/` | 平台无关的 Engine、Host、CommandBus、端口 | Electron、ws、fs、Three.js |
| `platforms/` | 平台协议 → 统一事件；只读连接 | 力度/投票等玩法规则 |
| `tools/` | 玩法状态机、物理、呈现数据 | 平台协议、窗口、磁盘 |
| `main/` | 唯一组合根：创建窗口、适配器、存储、IPC | 业务规则 |
| `preload/` | contextBridge 窄接口 | 直接把 ipcRenderer 交给页面 |
| `renderer/` | 视图与交互 | 网络、文件、平台密钥 |

依赖方向固定：`contracts ← kernel ← platforms/tools ← main`。渲染进程只依赖 contracts 的只读类型与 preload。

## 数据流

```
平台原始帧 → platform adapter → PlatformEvent
  → Engine.handlePlatformEvent
  → feed / recentMembers / 工具命令
  → snapshot + EngineEvent → preload → store → Vue

主播操作 → preload API → IPC(zod) → Engine → store/config → snapshot
```

**快照是渲染进程的唯一状态源。** 高频事件只追加 feed/member，低频状态整包替换；渲染进程不自行重算业务结果。

## IPC 约定

- 所有 invoke 入参先过 zod；平台原始报文在适配器内解析。
- 频道集中在 `contracts/ipc.ts`，preload 不暴露通用 `ipcRenderer`。
- 订阅接口返回 unsubscribe，组件卸载必须调用。
- 主进程推送分两类：低频 `snapshot` 与高频 `feed`/`members`/`log`。
- 错误回传消息，不把 cookie/token/密码写进日志或渲染进程状态。

## 平台与工具

- 平台工厂实现 `descriptor / configSchema / create`，可选 `probe`；新增平台自动进入网络连通性测试。
- 工具实现统一 `InteractionTool`；只读平台事件，不反向发弹幕/礼物/关注。
- 物理结果是唯一事实源；UI 只回放 presentation。

## 发布

标签 `v*` 触发 `.github/workflows/release.yml`：guard 校验 tag 在 main/master 且与 `package.json` 一致 → 三平台构建 → `scripts/release-notes.mjs` 从 `CHANGELOG.md` 生成 Release body → `action-gh-release`。

发布说明不猜提交内容，也不自动改 CHANGELOG；条目由人写进 `[Unreleased]`，CI 只负责把上次 tag 之后的条目带到 Release。

## 网络、日志、主题

- 网络：直连/系统/自定义代理，统一 `NetworkProxyInfo`；平台请求与 WSS 都走它。详见 [design/network.md](design/network.md)。
- 日志：winston 按天 + 20MB 滚动，设置页可改等级、收集 zip。详见 [design/logging.md](design/logging.md)。
- 主题：dark/light/system；渲染进程监听系统媒体查询，主进程同步原生标题栏。详见 [design/theme.md](design/theme.md)。

## 跨进程边界

- **main** 是唯一能 `new` 具体适配器、读磁盘、开窗口的地方。
- **kernel** 通过端口拿时间、随机、定时、存储、呈现。
- **renderer** 不 import `main`/`platforms`/`tools`；只 import contracts 类型和 preload API。
- **platforms** 不 import kernel/tools/electron；**tools** 不 import 其他工具。

## 已知取舍

| 取舍 | 代价 |
|---|---|
| 单控制台窗口 + 结果浮窗 | 不能同时开多个独立控制台；换页要回主窗口 |
| 抖音使用随包签名资产 | 算法更新必须发版本，不能远程热更 |
| 日志只写主进程 | 渲染进程异常需要通过 IPC/console 转发，当前只覆盖关键路径 |
