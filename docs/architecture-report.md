# 互动工坊 架构报告

版本：0.1.0
代码基线：main 分支，2026-10-19
报告范围：src 全部模块、Electron 主进程与两个渲染器、三个互动工具、两个平台适配器、数据持久化、构建与测试。

## 1. 摘要

互动工坊是一个本地优先的 Electron 桌面应用，面向直播间弹幕互动。它把不同平台的弹幕翻译成统一事件，再交给可插拔的互动工具处理；工具只负责玩法状态，窗口、存储、网络、定时器都由端口注入。

当前能力：

- 平台：B站匿名只读弹幕、本地模拟源，可同时连接。
- 工具：投骰子、转转盘、弹幕投票。
- 交互：弹幕命令、主播手动、倒计时、实时票数、物理模拟。
- 呈现：动画在工具面板内播放，最终结果在控制台内用 ResultOverlay 展示，带彩带和烟花，手动关闭。
- 控制台：通用工具切换器、全局右侧弹幕栏、平台开关、配置与历史。

非目标：

- 不做 B站登录、发弹幕、送礼、关注。
- 不做云端服务、账号体系、远程同步。
- 不做 OBS 专用 HTTP 浏览器源；当前结果弹窗在控制台窗口内，OBS 直接采集控制台。

## 2. 技术栈

| 层 | 选型 | 版本 |
| --- | --- | --- |
| 桌面壳 | Electron | 44.9 |
| 构建 | electron-vite / Vite | 6.0 / 8.3 |
| UI | Vue 3 script setup | 3.5.44 |
| 语言 | TypeScript | 5.9.3 |
| 物理 | cannon-es | 0.20 |
| 3D | Three.js | 0.186.1 |
| 平台网络 | ws + Node fetch | ws 8.22 |
| 校验 | zod | 4.6.7 |
| 测试 | Vitest | 5.0.5 |
| 打包 | electron-builder | 26.15.3 |

## 3. 总体架构

应用是单主进程 + 两个渲染器的结构：

    ┌──────────────────────────── Main Process ────────────────────────────┐
    │                                                                      │
    │  composition                                                         │
    │    ├─ ControlWindow      1560×960 控制台（按工作区收缩）             │
    │    ├─ ResultOverlay       控制台内结果弹窗（580px 卡）                 │
    │    ├─ JsonConfigStore    配置读写                                    │
    │    ├─ JsonHistoryStore   每个工具一份历史                            │
    │    └─ Engine                                                         │
    │         ├─ PlatformHost  平台适配器与连接状态                        │
    │         ├─ ToolHost      工具生命周期、定时器、历史                  │
    │         ├─ CommandBus    按注册顺序分发弹幕                          │
    │         └─ ResultSurface 动画/结果分流                               │
    │                                                                      │
    └───────────────┬──────────────────────────────────┬───────────────────┘
                    │ IPC                              │ IPC
                    ▼                                  ▼
          Control Renderer                    Result Renderer
          Vue 控制台                          Vue 结果弹窗
          工具面板 / feed / 配置              结果卡 / 彩带烟花

控制台渲染器不加载 Node，不直接访问文件、网络或窗口；所有能力通过 preload 暴露的窄接口进入主进程。

## 4. 分层与依赖规则

依赖方向：

    contracts <- kernel <- platforms / tools <- main
    contracts <- preload <- renderer

硬规则：

1. contracts 只依赖 zod 与自身，不 import src 内部模块。
2. kernel 不 import electron、ws、three、cannon-es、node:fs。
3. tools/domain 是纯函数，不 import 物理、Electron、ws、Vue。
4. tools/physics 只 import cannon-es、contracts 和本工具 domain。
5. main 是唯一组合根：创建窗口、适配器、存储、定时器。
6. preload 只暴露窄 API，不把 ipcRenderer 整体交给渲染进程。
7. 跨进程、配置、平台报文入口先用 zod 解析。
8. 工具之间禁止互相 import。
9. 物理结果是唯一事实源；UI 不重算点数。
10. UI 只使用 tokens.css 的视觉变量。

对应脚本：

- scripts/check-boundaries.mjs 检查层级 import。
- scripts/check-design-tokens.mjs 检查组件裸颜色。
- eslint 检查 Vue/TS 规则。

## 5. 模块清单

### 5.1 contracts

公共契约与 schema，无运行时依赖：

| 文件 | 作用 |
| --- | --- |
| config.ts | AppConfig、平台/工具配置、默认值 |
| dice.ts | 骰子面数、配置、结果、力度摘要 schema |
| wheel.ts | 转盘配置、结果、阶段 schema |
| vote.ts | 投票配置、结果 schema |
| view.ts | EngineSnapshot、PlatformView、三种 ToolView |
| presentation.ts | 骰子/转盘/投票的呈现数据与 dismiss |
| platform.ts | PlatformAdapter、事件、状态、userKey |
| tool.ts | InteractionTool、ToolContext、ToolAction |
| command-hint.ts | 命令提示发布/订阅类型 |
| ipc.ts | IPC channel、RendererApi |
| engine.ts | EngineEvent |
| time.ts | Clock、RandomSource、TimerScope、Cancellable |
| history.ts | ToolHistory 端口 |
| log.ts | Logger、LogEntry |
| result.ts | Result<T, E> |
| errors.ts | PlatformError |
| random.ts | RandomSource 辅助类型 |
| index.ts | 汇总导出 |

### 5.2 kernel

平台无关内核：

| 文件 | 作用 |
| --- | --- |
| engine.ts | 应用状态、配置、feed、工具/平台 Host 组合、快照广播 |
| platform-host.ts | 适配器工厂、连接/断开/重连、状态表、注入弹幕 |
| tool-host.ts | 工具激活/停用、每工具 TimerScope、历史、ToolContext |
| command-hint-bus.ts | 工具收集命令 -> 模拟源的发布订阅 |
| command-bus.ts | 按工具注册顺序调用 handleChat，第一个消费者终止 |
| ports.ts | ConfigStore、SurfaceHost、TimerFactory |
| random.ts | MathRandom |

### 5.3 platforms

| 文件 | 作用 |
| --- | --- |
| bilibili/adapter.ts | 匿名 B站连接、WBI、WSS、重连、状态 |
| bilibili/protocol.ts | 16 字节包头、zlib/brotli、DANMU_MSG/SEND_GIFT/INTERACT_WORD |
| bilibili/wbi.ts | mixinKey 表、参数排序、w_rid MD5 |
| bilibili/schema.ts | room_init、getDanmuInfo、nav、finger 的 zod schema |
| bilibili/index.ts | 导出适配器工厂 |
| mock/index.ts | 本地模拟源、自动观众（消费命令提示）、手动注入 |

### 5.4 tools

| 工具 | 形态 | 关键文件 |
| --- | --- | --- |
| dice | 弹幕命令 | manifest、domain/aggregate、domain/command、physics/geometry、physics/simulate、tool |
| wheel | 主播手动 | manifest、tool |
| vote | 弹幕命令 | manifest、domain/vote、tool |

### 5.5 main

| 文件 | 作用 |
| --- | --- |
| index.ts | 单实例锁、app 生命周期、--smoke |
| composition.ts | 组合根 |
| windows/control-window.ts | 控制台窗口、捕获截图 |
| windows/result-window.ts | 结果弹窗、定位、ready 握手 |
| surface/result-surface.ts | 动画/结果/关闭分流 |
| ipc/handlers.ts | IPC 注册与 zod 校验 |
| services/config-store.ts | 默认值合并、配置解析、保存 |
| services/history-store.ts | 每工具历史、串行写 |
| services/json-file.ts | 原子写临时文件 + rename |
| services/logger.ts | 内存环形日志 + console |
| services/timers.ts | 每工具定时器作用域 |
| services/clock.ts | 系统时钟 |
| smoke.ts | 自动截图流程 |

### 5.6 preload 与 renderer

| 文件 | 作用 |
| --- | --- |
| preload/index.ts | window.api |
| renderer/control/App.vue | 三栏 shell、页面切换 |
| renderer/control/store.ts | 快照、feed、toast、动作 |
| renderer/control/tool-panels.ts | 工具 id 到面板组件注册表 |
| renderer/control/components | 面板、feed、历史、开关、图标 |
| renderer/control/views | 控制台、工具、平台、设置 |
| renderer/control/result/dice-scene.ts | 面板内 Three.js 骰子场景 |
| renderer/control/result/ResultOverlay.vue | 应用内结果弹窗 |
| renderer/control/result/confetti.ts | 彩带 + 烟花 |
| renderer/src/styles/tokens.css | 唯一视觉 token |

## 6. 核心契约

### 6.1 AppConfig

    schemaVersion: 1
    platforms:
      bilibili: enabled, roomId
      mock: enabled, botsEnabled, botsIntervalSeconds, botNames
    tools:
      dice: faces, countdownSeconds, aggregation, fallbackPower, commandAliases
      wheel: segments, spinDurationSeconds
      vote: question, options, countdownSeconds, commandAliases
    overlay:
      alwaysOnTop

配置读取时先与 DEFAULT_APP_CONFIG 深合并，再走 appConfigSchema 解析；失败回落默认值并记日志。保存使用临时文件 + rename 原子替换。

说明：overlay.alwaysOnTop 是早期结果弹窗配置的兼容字段；当前结果弹窗固定置顶，UI 不再暴露该开关。

### 6.2 EngineSnapshot

    revision: number
    startedAt: number
    platforms: PlatformView[]
    tools: ToolView[]
    feed: FeedItem[]（最多 120 条）
    overlay: open, alwaysOnTop

ToolView 是 DiceToolView、WheelToolView、VoteToolView 的联合；所有都带 toolId/name/description/icon，因此控制台不依赖具体玩法。

### 6.3 PlatformEvent

- chat：ChatMessage（platform、roomId、userId、userName、text、receivedAt）
- gift：GiftEvent
- member：MemberEvent（进入/关注/分享）
- status：PlatformStatus（disconnected/connecting/connected/reconnecting/error）

所有 userId 统一转成 userKey = platform + ':' + userId，避免跨平台串票。

### 6.4 InteractionTool

    manifest: id/name/description/version/icon/commands
    activate(context, config)
    updateConfig(config)
    deactivate()
    handleChat(message): Promise<boolean>
    handleAction(action)
    view(): ToolView

ToolContext 注入 clock、timer、random、logger、history、present、notifyChange、announce、publishCommandHint。工具不碰窗口、不读写磁盘。

publishCommandHint 是发布订阅的写端：工具在 collecting 阶段发布当前命令样本，结束时发布 null；ToolHost 转发给 CommandHintBus，MockAdapter 订阅后决定是否注入。新增玩法不需要修改模拟源。

### 6.5 Presentation

- dice.roll：骰子动画数据，发到控制台面板。
- dice.result：最终点数，发到结果弹窗。
- wheel.result：转盘最终格，发到结果弹窗。
- vote.result：投票票数，发到结果弹窗。
- dismiss：关闭动画/结果。

数据流中，动画与结果明确分离：dice.roll 只给控制台，result 只给结果弹窗。

### 6.6 IPC

| Channel | 方向 | 用途 |
| --- | --- | --- |
| engine:snapshot | invoke | 首屏快照 |
| engine:event | main -> renderer | snapshot/feed/log/presentation |
| platform:connect / disconnect / update-config | invoke | 平台控制 |
| tool:action / update-config | invoke | 工具动作与配置 |
| mock:chat | invoke | 手动注入模拟弹幕 |
| overlay:preview | invoke | 预览当前工具 |
| overlay:present | main -> control | dice.roll / dismiss |
| overlay:dismissed | invoke | 控制台请求关闭 |
| feed:clear | invoke | 清空 feed |
| app:open-data-folder | invoke | 打开数据目录 |

## 7. 启动与生命周期

1. main/index.ts 判断 --smoke；smoke 使用 artifacts/smoke/data 作为 userData。
2. requestSingleInstanceLock；第二实例只唤起控制台。
3. app.whenReady 后 createApplication：
   - 创建 ControlWindow；结果弹窗由控制台渲染器内的 ResultOverlay 承担。
   - 创建 JsonConfigStore 并预加载配置。
   - 创建 ResultSurface。
   - 订阅 logger 到控制台。
   - 创建 Engine，注入时钟、随机、日志、存储、定时器工厂、历史工厂、Surface、平台工厂、三个工具、事件回调。
   - registerIpc 先注册。
   - engine.start。
   - 加载控制台页面。
4. Engine.start：
   - 读取配置。
   - 创建 PlatformHost、ToolHost、CommandBus。
   - 激活三个工具，给每个工具独立 TimerScope 和历史。
   - 写入系统 feed。
   - 广播首份快照。
   - 异步 autoConnect：mock 在前，bilibili 在后；bilibili 房间号为空则跳过。
5. 控制台渲染器挂载后调用 initStore：
   - invoke snapshot。
   - 订阅 engine:event。
   - 订阅 overlay:present。
   - loading 结束。

退出：

- before-quit 阻止一次，application.dispose -> Engine.shutdown。
- ToolHost.deactivateAll：每个工具清理定时器、发 dismiss。
- PlatformHost.shutdown：断开所有适配器。
- app.quit。

## 8. 数据流

### 8.1 首屏

    Engine.snapshot()
      -> IPC invoke
      -> store.applySnapshot
      -> App 三栏渲染
      -> 默认 activeToolId = dice（如果快照里没有则取第一个）

控制台渲染器不持有独立业务状态，所有工具状态来自快照。

### 8.2 弹幕入站

    B站 WSS / Mock
      -> 适配器
      -> PlatformEvent
      -> PlatformHost.handleEvent
      -> Engine.handlePlatformEvent
      -> feed 追加（chat/gift/member）
      -> CommandBus.dispatch(chat)
      -> 工具按注册顺序询问
      -> 第一个 return true 的工具消费
      -> Engine.publishSnapshot

注意：chat 会先进入 feed，再尝试命令分发，所以即使不是命令，右侧弹幕栏也能看到。

### 8.3 命令分发

- 工具顺序：dice -> wheel -> vote（组合根注册顺序）。
- wheel 的 handleChat 永远 false。
- dice 只在 collecting 阶段解析力度命令。
- vote 只在 collecting 阶段解析投票命令。
- 非法但命中命令前缀的消息会被对应工具消费（返回 true），避免落到别的工具；只记 warn，不刷屏。
- 未命中返回 false，继续下一个工具。

### 8.4 工具动作

    控制台按钮
      -> preload toolAction
      -> IPC
      -> Engine.toolAction
      -> ToolHost.handleAction
      -> 工具状态变化 / 定时器
      -> notifyChange
      -> Engine.publishSnapshot
      -> 控制台更新

倒计时统一走 ToolContext.timer，不直接用裸 setInterval；每个工具有独立 TimerScope，deactivate 时 clearAll。

### 8.5 骰子投掷与呈现

    start
      -> phase collecting
      -> 250ms interval 检查倒计时
      -> 聚合力度
      -> simulateDice 主进程物理
      -> phase rolling
      -> present(dice.roll)
      -> ResultSurface 发控制台
      -> store.diceRoll
      -> DicePanel 挂载 DiceScene
      -> Three.js 按帧回放
      -> 帧播放结束 + 300ms
      -> phase result + history.append
      -> present(dice.result)
      -> ResultSurface.moveTo(控制台当前屏幕)
      -> 控制台 ResultOverlay 显示
      -> 结果卡 + 彩带烟花

物理结果是唯一事实源；Three.js 只回放帧。

### 8.6 转盘

    spin
      -> phase spinning
      -> RandomSource 选 index
      -> view.currentSpin = spinId/resultIndex/durationMs
      -> WheelPanel 监听 currentSpin
      -> CSS rotate 5 秒，指针和中心不动
      -> duration + 350ms
      -> phase result + history
      -> present(wheel.result)
      -> 控制台 ResultOverlay 显示结果卡

没有弹幕命令，没有物理。

### 8.7 投票

    start
      -> phase collecting
      -> 倒计时 5–300 秒
      -> 观众发 投票 1 / 投票 选项文字
      -> parseVoteCommand
      -> Map<userKey, Ballot> 覆盖最后一票
      -> view() 实时 counts
      -> VotePanel 进度条
      -> 倒计时结束或提前结束
      -> tallyVotes + pollWinners
      -> phase result + history
      -> present(vote.result)
      -> 控制台 ResultOverlay 显示票数与并列最高

并列最高票全部展示；0 票不伪造赢家。

### 8.8 结果弹窗关闭

    结果弹窗 X / Esc / 点击遮罩
      -> actions.dismissOverlay
      -> IPC overlay:dismissed
      -> Engine.dismissOverlay
      -> ResultSurface.dismiss
      -> 控制台收到 dismiss presentation
      -> store 清理 diceRoll + resultPopup

结果弹窗不自动关闭。

### 8.9 配置保存

    面板输入（500ms debounce；平台 600ms）
      -> IPC tool:update-config
      -> Engine.updateToolConfig
      -> 合并 patch
      -> appConfigSchema.parse
      -> ToolHost.updateConfig
      -> 工具内部 schema.parse
      -> JsonConfigStore.save（原子写）
      -> publishSnapshot
      -> 面板刷新

平台配置类似，但会调用 PlatformHost.reconnect，如果当前已连接。

### 8.10 历史

    工具 context.history
      -> JsonHistoryStore
      -> history/<toolId>.json
      -> 文件最多 50 条，工具 view 只取最近 20 条

写入串行化，避免连续两次结果互相覆盖。历史读取失败不阻塞启动。

### 8.11 Feed 与日志

- Feed：最多 120 条，存在内存；chat/gift/member/system。
- 日志：AppLogger 内存 200 条 + console；控制台只保留最近 100 条。
- 聊天原文不写磁盘。

### 8.12 平台重连

B站适配器内部负责重连：

- socket close 且非主动断开 -> scheduleReconnect。
- 指数退避 1s、2s、4s... 最大 30s，带 0.8–1.2 抖动。
- 重连时重新 resolveRoom、buvid、WBI、getDanmuInfo、WSS。
- 失败继续退避，状态 reconnecting/error。

PlatformHost 只保留连接对象，不重复创建。

### 8.13 命令提示发布订阅

    dice/vote start
      -> ToolContext.publishCommandHint(samples)
      -> ToolHost
      -> CommandHintBus.publish
      -> 通知订阅者
      -> MockAdapter.hints = snapshot
      -> 下一次 3 秒定时
      -> 70% 注入当前工具命令 / 20% 普通聊天 / 10% 礼物

    dice/vote finish/cancel/deactivate
      -> publishCommandHint(null)
      -> CommandHintBus.clear
      -> MockAdapter 回到只发普通聊天/礼物

- wheel 没有命令，不发布提示。
- 多个工具同时收集时，MockAdapter 从当前提示里随机挑一个。
- 发布订阅让模拟源与具体玩法解耦；新增工具只要在收集阶段发布样本。

## 9. 三个工具

### 9.1 投骰子

阶段：idle -> collecting -> rolling -> result。

命令：

- 默认别名：力度、power。
- 支持 !力度 80、#力度 80、力度80、力度：80、POWER 60。
- 0–100 整数；越界丢弃。
- 同一观众最后一票覆盖。

聚合：

- mean 平均值。
- median 中位数。
- trimmedMean 截尾平均。
- 无有效票时 fallbackPower。

物理：

- cannon-es 刚体；固定步长 1/120 秒，最多 12 秒。
- 从中央发射台向上弹射：初始上冲速度 3.2 + power×0.23，自旋 2.5 + power×0.28；自旋轴以当前面法线为基准偏 24–54°，力度只改变能量，不参与选面。
- d6 渲染层用 RoundedBoxGeometry 做小倒角；物理仍是原凸包，避免改变读数与碰撞。
- 六种面数：d4/d6/d8/d10/d12/d20。
- 凸包几何；d10 使用五角双锥。
- 停稳判定：面朝上程度、稳定步数；连续 20 步低速后判定停稳。
- 低速停在棱上时轻推一次。
- 记录 60Hz 帧，主进程出结果，渲染层只回放。

呈现：

- dice.roll 给 DicePanel，面板 3D 骰盒内播放。
- 面板骰盒响应式，最大 760px，4:3；空闲倒计时环 220px。
- 场景含发射台、地面网格、虚线导轨和 3/6/9/12 高度环；相机随骰子高度上升并后拉，高力度时仍保留地面参照。
- 面板右侧显示「合力」24px 数值 + 0–100 进度条，说明力度决定抛投强度、点数仍由物理决定。
- config.directRoll=true 时出现「直接投掷」按钮：跳过收集，用 fallbackPower 直接投，仍写历史。
- 播完后 dice.result 给应用内结果弹窗。

### 9.2 转转盘

阶段：idle -> spinning -> result。

- 2–16 格，每格最多 20 字。
- 旋转时长 2–10 秒。
- 主播手动，无命令。
- RandomSource 均匀选格。
- WheelPanel 用 CSS rotate 原地旋转；圆盘 400px，扇形内标签随盘面旋转，中心品牌图标顶部的小三角作为固定指针（带深色投影，避免和同色扇形糊在一起）。
- 标签字号有上限并按文本长度自适应：短选项封顶，长选项缩到两行容量内；不同格数上限 22/20/18/16/14/12px。
- 预设：最多 12 个命名转盘，保存 segments + spinDurationSeconds；同名覆盖。
- duration + 350ms 后出结果。
- 结果弹窗只显示最终格，不重播转盘。

### 9.3 弹幕投票

阶段：idle -> collecting -> result。

- 2–8 个选项，选项不能重复。
- 问题最多 80 字，选项最多 20 字。
- 倒计时 5–300 秒；投票中左侧顶部显示 64px 大数字 + 进度条。
- 默认命令别名：投票、vote。
- 支持 1-based 序号和选项文字。
- 默认同一 userKey 只计第一票；allowRevote=true 时后票覆盖前票。
- 实时 counts + 进度条。
- 结束后并列最高全部展示；0 票显示无人投票。
- 历史记录问题、选项、counts、totalVotes、winners、at。
- 预设：最多 12 个命名投票，保存 question + options + countdownSeconds；同名覆盖。
- 预览使用示例分布，不写历史。

## 10. 平台适配

### 10.1 B站

只读匿名，不登录、不发消息。

连接流程：

1. 规范化房间输入：纯数字或从 URL 提取数字。
2. GET room_init?id=... -> room_id、live_status。
3. GET x/frontend/finger/spi -> 匿名 buvid3/buvid4。
4. GET x/web-interface/nav -> wbi_img、sub_url。
5. WBI：mixinKey 表重排，参数排序，过滤 !'()*，MD5 生成 w_rid。
6. GET getDanmuInfo?id=...&type=0&web_location=444.8&wts=...&w_rid=... -> token、host_list。
7. host 去重，最多尝试 4 个。
8. WSS wss://host:port/sub，16 字节包头，OP_AUTH。
9. 认证 body：uid 0、roomid、protover 3、platform web、type 2、key token、buvid。
10. OP_AUTH_REPLY code 0 -> 连接成功；每 30 秒心跳。
11. OP_MESSAGE 解压：protover 2 zlib，protover 3 brotli。
12. 解析 DANMU_MSG、SEND_GIFT、INTERACT_WORD。

状态：

- connected 时 detail 显示真实房间号和直播中/轮播/未开播。
- -352：刷新 WBI 密钥重试一次；仍失败提示限流/网络。
- HTTP 5xx/网络错误最多重试 3 次；错误带 cause。
- 断线指数退避重连。
- 不写 cookie、不保存 token。

影响范围：

- 只读订阅 B站公开弹幕；不发弹幕/礼物/关注。
- 每个客户端独立 token/WSS，多个弹幕机互不抢占。
- 不改变主播推流状态；单路连接对平台负载可忽略。
- 高频/批量连接可能被平台限流的是自己的 IP。

### 10.2 本地模拟

- 无网络。
- 可自动观众：默认间隔 3 秒，70% 力度、20% 聊天、10% 礼物。
- 支持手动注入弹幕。
- 用于离线演示与 smoke。

## 11. 主进程窗口与 Surface

### 11.1 控制台

- 目标 1560×960，按配置的显示器（默认鼠标所在屏）workArea 自动收缩并居中；最小 1120×720。
- 设置页通过 window:displays / window:set-display 选择屏幕；配置持久化到 appConfig.window.display。
- 弹幕栏模式配置为 appConfig.feed.mode；snapshot.feedMode 驱动 App 栅格。
- 开发模式窗口图标读取 `build/icon.png`；打包后从 `extraResources/icon.png` 读取，任务栏不再显示 Electron 默认图标。
- contextIsolation true，nodeIntegration false。
- 不加载远程页面；开发模式只加载 ELECTRON_RENDERER_URL。
- 三栏布局：左导航 216px、中内容、右 feed 320px；小于 1180px 隐藏 feed。

### 11.2 应用内结果弹窗

- ResultOverlay 覆盖控制台窗口，z-index 40，背景 color-mix + blur 4px。
- 卡片 580px，--surface 实底，20px 圆角，--shadow-pop。
- 彩带画布铺满控制台窗口，盖在卡片上方。
- 点击遮罩、右上角或 Esc 关闭；不自动消失。
- OBS 采集控制台窗口即可包含结果弹窗。

### 11.3 ResultSurface

    dice.roll -> 控制台工具面板
    dice.result / wheel.result / vote.result -> 控制台 ResultOverlay
    dismiss -> 控制台清理

动画和结果分离，避免在弹窗里重播整套动画；不再有第二窗口。

## 12. 渲染进程

控制台：

- reactive store：snapshot、logs、toast、activeToolId、diceRoll、resultPopup。
- initStore：首屏快照 + 订阅事件 + 订阅 presentation。
- actions：工具动作、配置、平台连接、模拟弹幕、预览、关闭结果。
- tool-panels.ts：工具 id 到面板组件的注册表，Dashboard 用动态 component。
- 面板：DicePanel、WheelPanel、VotePanel。每个工具 header 下方有测试命令条；骰子 3 个力度 chip，投票按选项数显示投票 chip，转盘无命令。feed 底部不再放工具命令。
- 历史：HistoryPanel、WheelHistoryPanel、VoteHistoryPanel。
- 公共：FeedPanel（68px 行高虚拟滚动）、ToolSwitcher、ToggleSwitch、StatusPill、Toast、AppIcon。
- 弹幕栏模式来自 snapshot.feedMode：full 320px / collapsed 44px / hidden；设置页通过 feed:set-mode 持久化。
- 设置页「清除所有数据」调用 app:clear-all-data：原生确认后删除 config.json、history、logs，relaunch 应用。
- 表单下拉统一使用 AppSelect（自定义深色 listbox），不再依赖系统原生 select 弹层。
- 设置页的 GitHub 仓库/问题反馈按钮通过 app:open-external 交给系统默认浏览器；控制台也拦截 window.open 与外部导航，禁止应用内打开。

结果弹窗：

- ResultOverlay 根据 toolId 渲染骰子点数、转盘结果或投票票数。
- confetti.ts 画彩带 + 三簇烟花，2.2 秒。
- 结果卡不播放工具动画。

## 13. 数据持久化

| 路径 | 内容 | 上限 |
| --- | --- | --- |
| userData/config.json | AppConfig | 无 |
| userData/history/dice.json | 骰子结果 | 文件 50，界面 20 |
| userData/history/wheel.json | 转盘结果 | 文件 50，界面 20 |
| userData/history/vote.json | 投票结果 | 文件 50，界面 20 |
| 内存 feed | 聊天/礼物/进场/系统 | 120 |
| 内存日志 | 主进程日志 | 200，UI 100 |

userData 默认是 %APPDATA%/interact-tools；--smoke 时切到 artifacts/smoke/data。

不保存：聊天原文、cookie、token、SESSDATA。

## 14. 视觉系统

- DESIGN.md 是唯一视觉事实源。
- tokens.css 是唯一颜色/间距/圆角/动效变量来源。
- check:design 扫描 Vue/CSS 中的裸 hex/rgb/rgba。
- 控件规格：开关 36×20；按钮 34/36 高；卡片 14px 圆角；结果弹窗 20px 圆角。
- 青柠只用于主操作、当前状态、结果数字。
- 控制台卡片无投影；浮层/结果弹窗才允许阴影。
- 结果弹窗为控制台内浮层，结果卡 580px，彩带画布铺满控制台窗口、覆盖卡片上方。

## 14.1 品牌图形

- 标志是「实心对话气泡 + 负形四角火花」：气泡代表弹幕互动，火花代表实时/结果。
- 单一 currentColor，火花是镂空；青柠底显示深色，深色底显示青柠。
- 侧边栏 24px、转盘中心 38px、应用图标 512px；源文件 build/icon.svg / build/icon.png。
- UI 不再使用「1017」四个数字；1017 仅作为模型发布日期/技术 appId 保留。

## 15. 测试、构建与发布

测试：

- 12 个测试文件，45 个用例通过，1 个 B站真连用例默认跳过。
- 覆盖骰子 domain、几何、物理、工具、轮盘工具、投票 domain/工具、命令提示总线、MockAdapter、B站协议、WBI。
- 真连测试：LIVE_BILIBILI=1 npx vitest run tests/bilibili-live.test.ts；最近房间 6 收到 6 条。

构建：

    npm run typecheck
    npm run lint
    npm run test
    npm run build
    npm run smoke
    npm run package:win

smoke 流程：

- 控制台首屏截图。
- 转盘面板截图。
- 平台页截图。
- 投票面板、投票中、投票结果截图。
- 骰子面板投掷中、骰子结果截图。
- 转盘旋转中、转盘结果截图。
- 打包后 --smoke 再跑一次。

产物：

- release/Interact-Studio-0.1.0-setup.exe
- release/Interact-Studio-0.1.0-portable.exe

## 16. 扩展点

### 加平台

1. 实现 PlatformAdapterFactory / PlatformAdapter。
2. 在 contracts/platform.ts 的 PlatformId 和 config schema 增加平台。
3. 在 composition.ts 注册 factory。
4. 在 PlatformsView 增加开关与配置。
5. 协议报文加 fixture 测试。

### 加工具

1. contracts 增加 config/result/view。
2. tools/<id> 增加 manifest/domain/tool。
3. composition.ts 注册 new Tool。
4. contracts/view.ts 的 ToolView 联合类型增加。
5. control/tool-panels.ts 注册面板。
6. Dashboard 加历史分支。
7. ToolsView 加入口。
8. 有呈现时在 presentation 和 ResultOverlay 加 kind。
9. 测试状态机、命令、配置、历史。

### 加结果形态

- contracts/presentation.ts 加 kind。
- main/surface/result-surface.ts 分流。
- renderer/src/control/result/ResultOverlay.vue 渲染。
- ResultOverlay/preload 类型加 payload。

## 17. 安全与合规

- 渲染进程 contextIsolation true，nodeIntegration false。
- 不加载远程页面。
- preload 只暴露固定方法。
- IPC 入口 zod 校验。
- 配置文件原子写；坏文件回落默认。
- 不保存 cookie/token/SESSDATA。
- B站只读匿名，不发送互动。
- 单实例锁避免多开写入配置。
- 结果弹窗/控制台都无 Node 直通。

## 18. 已知限制与技术债

1. B站匿名读；未开播/轮播房间连接成功但 0 弹幕；-352 仍可能由网络/风控触发。
2. B站不登录、不发弹幕、不支持 SESSDATA。
3. OBS 直接采集控制台窗口；尚未在真实 OBS 内实测。
4. 没有隐藏控制台的纯净舞台模式；动画只在控制台面板内。
5. d10 使用五角双锥，不是标准五角偏方面体。
6. Engine 的快照当前是即时全量广播，没有 50ms 合并；高频弹幕时依赖 feed 增量，但工具 notify 仍可能触发整包。
7. overlay.alwaysOnTop 是历史兼容字段，当前应用内结果弹窗不使用它。
8. 结果弹窗不自动关闭，忘记关闭会一直覆盖控制台。
9. 没有窗口大小/位置持久化；默认按工作区取 1560×960 上限。
10. Mock 自动观众依赖工具发布的命令提示；没有工具 collecting 时只发普通聊天/礼物。
11. NSIS 安装向导未逐页点击验证；只做了打包后 smoke。
12. UI 组件没有独立单测，主要靠 smoke 截图。
13. Engine.dismissOverlay 仍把 dice 作为 toolId 传给 SurfaceHost；只影响 dismiss 标签，不影响关闭行为，但语义上应改成 overlay 或当前工具。

## 19. 关键文件地图

    src/contracts/                公共契约
    src/kernel/                   平台无关内核
    src/platforms/bilibili/       B站适配器
    src/platforms/mock/           本地模拟
    src/tools/dice/               骰子
    src/tools/wheel/              转盘
    src/tools/vote/               投票
    src/main/                     Electron 主进程
    src/preload/                  contextBridge
    src/renderer/src/control/     控制台 + ResultOverlay
    src/renderer/src/styles/      tokens/base
    scripts/                     边界/设计检查/启动
    tests/                       Vitest
    docs/                        架构、ADR、指南、验收

## 20. 结论

这是一个分层清晰的本地优先 Electron 应用：contracts 定义数据，kernel 组合平台/工具/呈现，main 负责 Electron 与磁盘，renderer 只做展示与交互。三个工具共享同一套快照、命令总线、定时器端口、历史存储与应用内结果弹窗，新增玩法主要改 contracts、tools、panel 注册表和结果渲染。

当前最值得继续投入的方向：

1. 面板动画上屏的舞台模式（OBS 纯净输出）。
2. 快照广播合并与高频弹幕性能。
3. B站真实房间/多显示器/OBS 的现场验证。
4. 窗口大小/位置持久化。
5. 结果弹窗的显示器选择策略（跟随控制台之外，是否允许手动指定）。
