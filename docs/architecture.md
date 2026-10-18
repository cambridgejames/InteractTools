# 架构

> 状态：已定稿，待实现。修改契约时必须同步本文件与 `docs/adr/` 下的对应决策。

## 1. 目标与约束

互动工坊是一个**单机 Electron 桌面应用**，同时接入多个直播间，把不同平台的弹幕翻译成统一事件，再交给可插拔的互动工具处理。第一个工具是投骰子。

设计约束：

- 多平台并存：B站与本地模拟可以同时连接，消息带平台标识。
- 工具可扩展：新增玩法不修改内核。
- 物理可信：结果由刚体模拟产生，不是随机抽面。
- 离线可用：不依赖自建服务端；B站不可用时本地模拟仍能完整跑通。
- 结果可见：动画在工具面板内就地播放；停稳后在控制台内弹出应用内结果弹窗，OBS 采集控制台即可。

## 2. 分层

```
┌──────────────────────────── Electron App Shell ────────────────────────────┐
│  main（组合根）      preload（类型化桥）      renderer（控制台 + 结果弹窗）  │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ Surface Port
┌───────────────────────────────▼────────────────────────────────────────────┐
│ kernel：Engine / ToolHost / PlatformHost / CommandBus / Timer / Store Port │
└───────────────┬───────────────────────────────────┬────────────────────────┘
                │                                   │
      PlatformAdapter                        InteractionTool
   （bilibili / mock）                    （dice / 未来的工具）
                │                                   │
                └────────────── contracts ──────────┘
                    纯类型 + zod schema，零业务依赖
```

依赖方向只有一个：外层依赖内层。`contracts` 不知道 `kernel`，`kernel` 不知道 Electron，工具不知道窗口。

## 3. 依赖规则

| 模块 | 可以依赖 | 禁止依赖 |
| --- | --- | --- |
| `contracts/**` | zod、自身 | 任何 `src` 内部模块 |
| `kernel/**` | contracts | electron、ws、three、cannon-es、node:fs、DOM |
| `platforms/**` | contracts、ws、zod、Node 标准库 | kernel、tools、electron |
| `tools/*/domain/**` | contracts | 物理、平台、Electron、Vue |
| `tools/*/physics/**` | contracts、cannon-es、本工具 domain | Electron、ws、Vue |
| `main/**` | 全部 | 无（组合根） |
| `preload/**` | contracts、electron | kernel 具体实现、渲染进程代码 |
| `renderer/**` | contracts 的只读类型、preload API、Vue/Three | kernel、main、platforms、Node API |

边界由 ESLint 的 `no-restricted-imports` 按目录覆盖来强制，不靠自觉。CI 里 `npm run lint` 失败即拒绝合并。

## 4. 核心契约

### 4.1 平台事件

平台适配器只做翻译：把 WebSocket 帧、HTTP 响应、模拟输入变成标准化事件，不判断弹幕用来做什么。

```ts
export type PlatformId = 'bilibili' | 'mock';

export interface ChatMessage {
  readonly id: string;
  readonly platform: PlatformId;
  readonly roomId: string;
  readonly userId: string;
  readonly userName: string;
  readonly text: string;
  /** Unix 毫秒时间戳。 */
  readonly receivedAt: number;
}

export type PlatformEvent =
  | { readonly type: 'chat'; readonly message: ChatMessage }
  | { readonly type: 'gift'; readonly gift: GiftEvent }
  | { readonly type: 'member'; readonly member: MemberEvent }
  | { readonly type: 'status'; readonly status: PlatformStatus };
```

参与者统一用 `userKey = platform + ':' + userId` 标识。这样同一个人在 B站和模拟源不会串票，换平台也不会误合并。

### 4.2 适配器

```ts
export type PlatformPhase =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface PlatformStatus {
  readonly phase: PlatformPhase;
  readonly detail?: string;
  readonly connectedAt?: number;
}

export interface PlatformAdapter {
  readonly descriptor: PlatformDescriptor;

  /** 失败必须抛 PlatformError，且不留下半连接状态。 */
  connect(config: unknown, signal: AbortSignal): Promise<void>;
  disconnect(): Promise<void>;

  /** 只读快照；UI 拿不到 socket、cookie 等实现细节。 */
  snapshot(): PlatformStatus;
}

export interface PlatformContext {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly emit: (event: PlatformEvent) => void;
}

export interface PlatformAdapterFactory {
  readonly descriptor: PlatformDescriptor;
  readonly configSchema: ZodType;
  create(context: PlatformContext): PlatformAdapter;
}
```

`connect` 接收 `AbortSignal`，断线和退出时统一取消重连、心跳与请求，不允许后台残留定时器。

B站适配器的 `getDanmuInfo` 需要 WBI 签名：先从 `nav` 取 `wbi_img`，推导 mixinKey，再对 `id / type / web_location / wts` 排序签名生成 `w_rid`。缺参数时接口会返回 `-352`，看起来像风控，实际是签名缺失；适配器会在 `-352` 时刷新密钥重试一次。

`room_init` 同时返回 `live_status`：连接成功后状态栏显示「直播中 / 轮播 / 未开播」。未开播时 WSS 仍保持连接，但没有新弹幕，这是房间状态而不是连接失败。房间输入支持 URL 或房间号；WSS host 去重后最多尝试 4 个。

### 4.3 工具

```ts
export interface ToolManifest {
  readonly id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  /** 供 UI 展示与冲突检查；真正的解析在工具内部。 */
  readonly commands: readonly string[];
}

export interface ToolContext {
  readonly clock: Clock;
  readonly timer: TimerScope;
  readonly random: RandomSource;
  readonly logger: Logger;
  readonly history: ToolHistory;
  readonly present: (presentation: Presentation) => Promise<void>;
  readonly notifyChange: () => void;
  readonly announce: (text: string) => void;
}

export interface InteractionTool {
  readonly manifest: ToolManifest;

  activate(context: ToolContext, config: unknown): Promise<void>;
  updateConfig(config: unknown): Promise<void>;
  deactivate(): Promise<void>;

  /** 消费了返回 true；未命中返回 false，交给下一个工具。 */
  handleChat(message: ChatMessage): Promise<boolean>;
  handleAction(action: ToolAction): Promise<void>;

  /** 必须是可序列化的只读快照。 */
  view(): ToolView;
}
```

工具不 import 其他工具；需要共享时把通用能力放进 contracts 或 kernel。工具不直接操作窗口，只调用 `present()`。

### 4.4 呈现

```ts
export type Presentation =
  | { readonly kind: 'dice.roll'; readonly payload: DiceRollPresentation }
  | { readonly kind: 'wheel.spin'; readonly payload: WheelSpinPresentation }
  | { readonly kind: 'dismiss'; readonly toolId: ToolId };

export interface DiceFrame {
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
}

export interface DiceRollPresentation {
  readonly rollId: string;
  readonly faces: DiceFaces;
  readonly value: number;
  readonly power: number;
  readonly seed: number;
  /** 由主进程物理模拟录制的逐帧位姿，DicePanel 只回放。 */
  readonly frames: readonly DiceFrame[];
  readonly frameSeconds: number;
  readonly settled: boolean;
  readonly stats: PowerSummary;
}
```

呈现是**数据**，不是回调。`SurfaceHost` 全部发到控制台：`dice.roll` 给工具面板，`dice.result` / `wheel.result` / `vote.result` 给应用内 ResultOverlay；动画和结果分开，不创建第二窗口。

### 4.5 引擎事件与快照

```ts
export type EngineEvent =
  | { readonly type: 'snapshot'; readonly snapshot: EngineSnapshot }
  | { readonly type: 'feed'; readonly item: FeedItem }
  | { readonly type: 'log'; readonly entry: LogEntry }
  | { readonly type: 'presentation'; readonly presentation: Presentation };
```

控制台通过 `snapshot` 渲染全部状态，通过 `feed` 追加时间线。当前快照在状态变化时即时广播，没有 50ms 合并；feed 使用增量事件与虚拟滚动降低渲染压力。ResultOverlay 只接收最终 result，不接收逐帧动画。

## 5. 运行时对象图

```
Electron main
  └─ CompositionRoot
       ├─ JsonConfigStore（userData/config.json）
       ├─ SystemClock / NodeTimer / FileLogger
       ├─ PlatformHost
       │    ├─ BilibiliAdapterFactory
       │    └─ MockAdapterFactory
       ├─ ToolHost
       │    └─ DiceTool
       ├─ SurfaceHost
       │    ├─ ControlWindow
       │    └─ ResultOverlay（应用内结果弹窗）
       └─ Engine
            ├─ CommandBus
            └─ EventPublisher（→ IPC → renderer）
```

只有 `main/composition.ts` 允许出现具体类名。测试可以替换 Clock、Timer、Store、Surface，而不启动 Electron。

## 6. 投骰子的数据流

1. 适配器收到原始消息，翻译成 `ChatMessage`，交给 `PlatformHost`。
2. `Engine` 把消息追加到 feed，并交给 `CommandBus`。
3. `CommandBus` 依次调用已激活工具的 `handleChat`；骰子工具解析 `!力度 80`。
4. 力度按 `userKey` 去重，同一观众只保留最后一条；非法值丢弃并记日志。
5. 倒计时结束，`domain/aggregate.ts` 聚合出力度。
6. `physics/simulate.ts` 用固定 seed 跑 cannon-es，得到点数与逐帧位姿。
7. `DiceTool` 调 `ctx.present({ kind: 'dice.roll', payload })`。
8. `SurfaceHost` 把 `dice.roll` 发给控制台，`DicePanel` 用 Three.js 就地回放。`directRoll` 开启时，`direct` action 跳过收集，用 fallbackPower 直接投。
9. 面板动画结束后，`SurfaceHost` 把 `dice.result` 发给控制台，ResultOverlay 播放彩带烟花并等待手动关闭。
10. 控制台通过快照和 feed 同步状态；历史记录写入配置目录。

转盘是另一条链路：主播在控制台点「开始旋转」→ `Engine.toolAction('wheel', { type: 'spin' })` → `WheelTool` 用 `RandomSource` 选格 → `WheelToolView.currentSpin` 驱动 `WheelPanel` 原地 CSS 旋转 → 停稳后 `wheel.result` 弹应用内结果弹窗。它**不经过 CommandBus**，也没有物理模拟。

投票是第三条链路：`VoteTool` 在倒计时内解析 `投票 1` / `投票 选项文字`，按 `userKey` 只保留最后一票；`view()` 把实时票数和剩余时间给 `VotePanel`，倒计时结束或「提前结束」后统计并列最高票，发 `vote.result` 给 ResultOverlay。它不物理、不随机、不写弹幕。

命令提示走 `CommandHintBus` 发布订阅：dice/vote 进入 collecting 时通过 `ToolContext.publishCommandHint` 发布命令样本，结束时清空；`MockAdapter` 订阅后只在有提示时按概率注入当前工具命令。这样模拟源不 import 任何工具，新增玩法只需发布自己的样本。

## 7. 骰子领域

### 7.1 配置

```ts
export type DiceFaces = 4 | 6 | 8 | 10 | 12 | 20;
export type Aggregation = 'median' | 'mean' | 'trimmedMean';

export interface DiceConfig {
  readonly faces: DiceFaces;
  readonly countdownSeconds: number;
  readonly aggregation: Aggregation;
  readonly fallbackPower: number;
  readonly commandAliases: readonly string[];
}
```

默认值：d6、30 秒、中位数、兜底 50、别名 `['力度', 'power']`；结果弹窗手动关闭。

### 7.2 命令

形如 `!力度 80`、`#力度 80`、`力度80`、`力度：80` 都接受。命令名可配置别名；值必须是 0–100 的整数，越界直接丢弃。

### 7.3 聚合

- `mean`：算术平均。
- `median`：排序后取中位；偶数个取中间两个的平均。默认。
- `trimmedMean`：两端各去掉 `floor(n * 0.1)` 个（至少保留 1 个），再平均；`n < 3` 时退化为均值。

结果同时给出 `count / min / max / mean / median / trimmedMean`，UI 展示采用的方案，但保留全部数值供复盘。

### 7.4 状态机

```
idle ──start──▶ collecting ──timeout──▶ rolling ──frames end──▶ result
  ▲                  │ cancel                                   │
  └──────────────────┴──────────────────────────────────────────┘
```

- `collecting` 期间接受力度指令；重复开始被拒绝。
- `rolling` 期间不再接受指令，避免结果与统计不一致。
- `result` 保留最后一次结果与历史；自动回到 `idle` 由 `reset` 或下一次开始触发。
- 所有定时器通过 `TimerService` 创建，`deactivate` 时统一取消。

### 7.5 转盘

- 无弹幕命令：`handleChat` 永远返回 `false`，不抢骰子的指令。
- 配置：`segments`（2–16 个标签）、`spinDurationSeconds`（2–10）。
- 结果：`RandomSource.next()` 均匀选格；`currentSpin` 只给面板提供 `resultIndex / durationMs`，面板负责把对应格子转到指针下，最终标签由 ResultOverlay 展示。
- 历史：`history/wheel.json`，与骰子分开。
- 控制台入口：`control/tool-panels.ts` 注册 `wheel → WheelPanel`；工具切换器选中后动态渲染，Dashboard 不知道具体工具。

## 8. 物理

- 坐标：Y 轴向上，地面 `y = 0`，长度单位约等于骰子外接球半径。
- 几何：顶点定义 + 凸包算法求面；d10 用五角双锥（pentagonal bipyramid，10 个三角面），d4/d6/d8/d12/d20 用标准多面体。
- 刚体：cannon-es `ConvexPolyhedron`，质量 1；地面 `Plane`；摩擦 0.4，弹性 0.35。
- 初始条件：位置、朝向、角速度由 seed 派生；力度 0–100 映射到向上初速度和初始自旋，自旋轴相对面法线偏 24–54°，**不参与选面**。骰子从中央发射台弹射，面板相机随高度上升后拉。d6 渲染使用圆角倒角，物理凸包不变。
- 固定步长 `1 / 120` 秒，最多 10 秒；每两步记录一帧（60Hz）。
- 静止判定：线速度 < 0.08、角速度 < 0.1，连续 30 步，且存在法线接近竖直的面。
- 读数：d4 取贴地面（法线 y 最小），其余取朝上面（法线 y 最大）。
- 未停稳：先施加一次轻推；仍失败则取最近面，`settled: false` 写进结果，UI 明确标注。

物理是纯函数：`simulate({ faces, power, seed })` 不读时钟、不读配置、不写日志。相同输入必须得到相同输出；单测固定 seed 断言点数和总帧数。

## 9. 配置与持久化

配置文件位于 `app.getPath('userData')/config.json`，结构带 `schemaVersion`：

```json
{
  "schemaVersion": 1,
  "platforms": {
    "bilibili": { "enabled": false, "roomId": "" },
    "mock": {
      "enabled": true,
      "botsEnabled": true,
      "botsIntervalSeconds": 3,
      "botNames": ["小满", "阿七"]
    }
  },
  "tools": {
    "dice": {
      "faces": 6,
      "countdownSeconds": 30,
      "aggregation": "median",
      "fallbackPower": 50,
      "commandAliases": ["力度", "power"],
      "directRoll": false
    },
    "wheel": {
      "segments": ["一等奖", "二等奖", "三等奖", "谢谢参与"],
      "spinDurationSeconds": 5,
      "presets": []
    },
    "vote": {
      "question": "今晚玩什么？",
      "options": ["方案 A", "方案 B", "方案 C"],
      "countdownSeconds": 30,
      "commandAliases": ["投票", "vote"],
      "presets": []
    }
  },
  "overlay": { "alwaysOnTop": true },
  "window": { "display": "cursor" }
}
```

写入采用「临时文件 + rename」的原子替换。读取时先用默认值深合并，再用 zod 解析；失败则回落默认值并记错误日志，不阻塞启动。任何平台 token、cookie 都不写入该文件。

## 10. IPC

- 渲染进程只能看到 `window.api`；preload 暴露固定方法，不暴露 `ipcRenderer`。
- 每个 `invoke` 通道在 main 侧有 zod 入参校验；返回值也必须是可序列化数据。
- 主进程 → 渲染进程只有一条事件通道 `engine:event`，携带 `EngineEvent`。
- 所有 presentation 都走控制台的 `overlay:present`；结果关闭走 `overlay:dismissed`，不再有 result 通道。
- 所有通道名集中在 `contracts/ipc.ts`，禁止散落字符串。

## 11. 错误与生命周期

- 预期失败用 `Result<T, E>`；平台错误码：`network / auth / protocol / rate-limited / room-not-found / unsupported`。
- `throw` 只用于违反不变量（例如未知工具 id）；由 main 的全局 handler 记录并展示。
- 每个平台连接持有独立 `AbortController`；`disconnect` 先 abort，再等待 socket 关闭。
- 重连指数退避 1s、2s、4s……上限 30s，带 ±20% 抖动；用户手动断开后不再重连。
- 工具 `deactivate` 必须清空定时器、取消未完成的呈现；结果弹窗关闭时通知 SurfaceHost。

## 12. 可测试性

- domain 纯函数：聚合、命令解析、状态迁移，直接用表格驱动测试。
- 物理：固定 seed、固定步长，断言点数、帧数、停稳标记；再做一次 200 次的分布冒烟（不进 CI 常规套件）。
- 平台协议：保存二进制帧 fixture，测分包、brotli、心跳、异常包。
- 内核：FakeClock / FakeTimer / MemoryStore / RecordingSurface，测超时、取消、重复开始。
- UI：Vitest 组件测试覆盖关键分支；Electron 启动用 `npm run smoke` 截图，检查白屏与 console error。

## 13. 扩展点

| 要加的东西 | 改动 |
| --- | --- |
| 平台 | 新增 `platforms/<id>/` 工厂，注册到 composition，补 config schema 与 fixture 测试 |
| 工具 | 新增 `tools/<id>/`，实现 `InteractionTool`，注册到 ToolHost，并在控制台加一个面板分支 |
| 控制台面板 | 在 `control/tool-panels.ts` 注册工具 id → 面板组件；有动画时在面板内消费 view / presentation |
| 结果弹窗形态 | 在 `Presentation` 增加 result kind，在 `ResultOverlay` 注册结果渲染 |
| 呈现介质 | 实现新的 Surface（例如 HTTP 浏览器源），内核与工具不动 |

## 14. 非目标

- 不做云端账号、跨设备同步。
- 第一版不做 B站登录、发弹幕、礼物答谢语音。
- 不做移动端。
- 不做插件市场；工具随应用发布，接口先稳定。
