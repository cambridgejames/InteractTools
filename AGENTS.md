# AGENTS.md

本文件是这个仓库的项目宪法。人类与 AI 协作者都按它工作；临时指令与它冲突时，先改这里，再改代码。

## 1. 项目是什么

互动工坊：面向直播间的弹幕互动工具集。Electron 桌面端，多平台接入，互动玩法以工具插件的形式扩展。第一个工具是「投骰子」：观众用弹幕设置力度，倒计时结束后聚合力度，用真实刚体物理掷骰；骰子在控制面板内滚动，停稳后用应用内结果弹窗展示。

当前阶段：可运行原型。通用工具控制台（工具切换器）、本地模拟、B站匿名适配器（WBI 签名，真连已验证）、抖音只读适配器（本地签名，真实 WSS 与弹幕帧已验证）、骰子、转转盘与弹幕投票三个工具、真实物理、面板内动画、应用内结果弹窗 + 彩带烟花与冒烟截图已落地；安装包实机安装与 OBS 捕获仍待验证。

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面 | Electron 44 + electron-vite 6 |
| UI | Vue 3 `<script setup>` + TypeScript |
| 3D | Three.js（只允许出现在 control/result 与 DicePanel 内联舞台） |
| 物理 | cannon-es（只允许出现在主进程与物理模块） |
| 平台 | ws + Node fetch（B站）、ws + protobufjs + vm（抖音本地签名）、本地 mock |
| 校验 | zod |
| 测试 | Vitest |

## 3. 命令

工程骨架落地后，以下脚本是唯一入口；新增或改名必须同步本节与 CI。

```bash
npm run dev          # 开发模式（Electron + Vite HMR）
npm run typecheck    # 主进程 / 预加载 / 渲染进程类型检查
npm run lint         # ESLint + 依赖边界 + 设计 token
npm run test         # Vitest 单测（一次）
npm run test:watch   # 监听模式
npm run build        # typecheck + 产物构建
npm run smoke        # 构建后启动 Electron 冒烟并截图
npm run package:win  # Windows x64/arm64 安装包
npm run package:mac  # macOS x64/arm64 dmg/zip
npm run package:linux # Linux x64/arm64 AppImage/deb
```

不要用 `npx electron-vite ...` 绕过脚本；脚本里已经固定了环境变量和顺序。

## 4. 目录地图

```
src/
  contracts/                 公共契约：类型、zod schema、IPC 定义
  kernel/                    平台无关内核：Engine、Host、CommandBus、端口
  platforms/                 平台适配器：bilibili、douyin、mock
  tools/                     互动工具：dice（命令驱动）、wheel（主播手动）、vote（弹幕投票）
  main/                      Electron 主进程：组合根、窗口、Surface、存储、IPC
  preload/                   contextBridge 窄接口
  renderer/
    control/                 Vue 控制台
    control/result/          骰子 3D、结果弹窗、彩带烟花
    src/styles/tokens.css    唯一视觉 token
DESIGN.md                    视觉语言与组件规则
docs/
  architecture.md            架构与契约细节
  adr/                       决策记录
  guides/                    扩展指南
  testing.md                 测试策略
.agents/skills/              AI 协作者的可执行清单
```

## 5. 架构不变量（硬规则）

1. 依赖方向：`contracts ← kernel ← platforms / tools ← main`。`renderer` 只依赖 `contracts` 的只读类型和 preload 暴露的 API。
2. `contracts/**` 不 import 任何 `src` 内部模块，只允许 zod 与自身。
3. `kernel/**` 不 import `electron`、`ws`、`three`、`cannon-es`、`node:fs`。时间、随机、定时、存储、呈现全部通过端口注入。
4. `tools/*/domain/**` 是纯函数，不 import 物理、Electron、ws、Vue。
5. `tools/*/physics/**` 只 import `cannon-es`、contracts 和本工具 domain。
6. `main/**` 是唯一组合根：只有这里能 `new` 具体适配器、创建窗口、读写磁盘。
7. `preload` 只暴露窄接口，禁止把 `ipcRenderer` 整体交给渲染进程。
8. 所有跨进程、配置文件、平台报文入口，先用 zod 解析，再进入类型系统。
9. 工具之间禁止互相 import；共享逻辑上移到 contracts/kernel 或 tools/shared。
10. 物理结果是唯一事实源；UI 不得自行随机、重算或改判点数。
11. UI 只允许使用 `src/renderer/src/styles/tokens.css` 的变量；禁止在组件里写死颜色、字体、圆角。视觉规格以 `DESIGN.md` 为唯一事实源。

## 6. TypeScript 与注释

- `strict` 全开，另开 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`verbatimModuleSyntax`。
- 禁止 `any`。边界用 `unknown` + zod；禁止用 `as` 掩盖类型错误，确需收窄时写类型守卫并说明原因。
- 预期失败用 `Result<T, E>`；`throw` 只用于违反不变量。
- 公共导出、单位、不变量、协议坑必须有 JSDoc；不写复述代码的注释。
- 标识符英文；文档与解释性注释中文；B站协议字段保留原文。
- 单文件超过约 400 行、单函数超过约 50 行时，先检查职责是否不清，而不是加注释拆行。

好的注释解释「为什么」，坏的注释复述「做了什么」：

```ts
// 不好：只是把签名翻译了一遍
// 设置力度
setPower(value: number): void

// 好：说明业务规则和取舍
/**
 * 记录观众的力度指令；同一观众以最后一条为准。
 *
 * 超出 0–100 的值直接丢弃而不是截断：把「999」静默当成 100
 * 会让观众误以为指令生效。
 */
recordPower(vote: PowerVote): void
```

## 7. 扩展流程

- 改 UI：先读 `DESIGN.md`，再按 `.agents/skills/design-review/SKILL.md` 执行；颜色、间距、组件不得在 Vue 文件里临时发明。
- 加平台：读 `.agents/skills/add-platform/SKILL.md`。
- 加工具：读 `.agents/skills/add-tool/SKILL.md`。
- 交付前：读 `.agents/skills/verify-app/SKILL.md`。

## 8. 完成定义（DoD）

- `npm run typecheck`、`npm run lint`（含 `check:design`）、`npm run test` 全绿。
- 新增或修改的逻辑有对应测试；协议解析用 fixture；物理用固定 seed 断言。
- `npm run build` 通过；涉及界面时 `npm run smoke` 有截图，且无白屏、无未处理报错。
- 文档与实现同步：契约变更必须更新 `docs/architecture.md` 和对应 ADR；UI 变更遵循 `DESIGN.md`。
- 没有新增 `any`、裸 `setInterval`、未处理的 Promise rejection。
- 不把「以后再说」留在代码里而不留 TODO 链接；TODO 必须写清触发条件。

## 9. 安全与合规

- 不在仓库提交 cookie、token、SESSDATA、房间凭据。
- 只接官方公开能力或匿名弹幕；不做破解登录、不伪造观众、不刷量。
- 所有平台只读弹幕/礼物/进场；不发送弹幕、礼物、关注或任何用户内容。
- 渲染进程禁用 Node 集成，开启 `contextIsolation`；不加载远程页面。
- 日志与历史记录不保存完整 cookie；用户数据只落在 `app.getPath('userData')`。

## 10. 提交

Conventional Commits，scope 用目录名或工具名：

```
feat(dice): replay recorded physics frames in overlay
fix(bilibili): handle brotli packets split across frames
docs(adr): record median aggregation decision
```

一次提交只做一件事；格式化与逻辑改动分开。
