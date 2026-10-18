# 新增平台适配器

本文以新增平台 `example` 为例。完整契约见 `docs/architecture.md` 第 4 节。

## 1. 先确认能力边界

适配器只做三件事：连接、翻译、报告状态。它不解析力度命令，不决定点数，不打开窗口。

允许的依赖：`contracts`、`ws`、Node 标准库、zod。禁止 import `kernel`、`tools`、`electron`。

## 2. 建文件

```
src/platforms/example/
  index.ts          # 导出 factory
  adapter.ts        # 连接与生命周期
  protocol.ts       # 原始帧/报文解析（可单测）
  schema.ts         # 平台配置 zod schema
```

平台 id 加入 `contracts/platform.ts` 的 `PlatformId` 联合类型；配置 schema 加入 `contracts/config.ts` 的注册表。

## 3. 实现 factory

```ts
export const exampleAdapterFactory: PlatformAdapterFactory = {
  descriptor: {
    id: 'example',
    name: '示例平台',
    capabilities: ['chat.read'],
  },
  configSchema: exampleConfigSchema,
  create(context) {
    return new ExampleAdapter(context);
  },
};
```

`create` 只做构造，不发起网络请求；连接发生在 `connect()`。

## 4. 实现适配器

```ts
export class ExampleAdapter implements PlatformAdapter {
  constructor(private readonly context: PlatformContext) {}

  async connect(config: PlatformConfig, signal: AbortSignal): Promise<void> {
    const parsed = exampleConfigSchema.parse(config);
    this.context.emit({ type: 'status', status: { phase: 'connecting' } });

    // 连接、鉴权、订阅；所有 await 都要能响应 signal。
    await this.open(parsed, signal);

    this.context.emit({ type: 'status', status: { phase: 'connected', connectedAt: Date.now() } });
  }

  async disconnect(): Promise<void> {
    // 幂等：重复调用不报错。
  }

  snapshot(): PlatformStatus {
    return this.status;
  }
}
```

约束：

- 失败抛 `PlatformError`，带可展示的中文消息和错误码。
- `disconnect` 幂等；先取消心跳/重连，再关闭 socket。
- 重连使用 `AbortSignal` 和退避，不要裸 `setInterval`。
- 日志不要打印完整 cookie、token、SESSDATA。

## 5. 翻译消息

```ts
const message: ChatMessage = {
  id: String(payload.msg_id),
  platform: 'example',
  roomId: this.roomId,
  userId: String(payload.uid),
  userName: payload.uname,
  text: payload.content,
  receivedAt: Date.now(),
};
this.context.emit({ type: 'chat', message });
```

同一用户在不同平台的 `userId` 可能相同，统一由内核拼成 `platform:userId`，适配器不要自己拼。

## 6. 协议测试

把真实抓包中**脱敏后的二进制帧**放进 `src/platforms/example/__fixtures__/`，至少覆盖：

- 单包 JSON。
- zlib / brotli 压缩包。
- 一个 WebSocket 帧里包含多个逻辑包。
- 心跳与鉴权回包。
- 未知 `cmd` 被忽略而不是崩溃。

不要在测试里连真实直播间。

## 7. 注册

在 `main/composition.ts` 把 factory 放进 `PlatformHost` 的列表。UI 的平台页从 `EngineSnapshot.platforms` 自动渲染，不需要为每个平台写页面。

## 8. 检查清单

- [ ] `PlatformId` 与配置 schema 已更新。
- [ ] factory 已注册，UI 能看到平台卡片。
- [ ] `connect / disconnect` 可重复调用，退出应用不残留定时器。
- [ ] 所有入口数据经 zod 解析。
- [ ] fixture 测试覆盖正常与异常包。
- [ ] 文档与 `docs/architecture.md` 的能力表一致。
- [ ] 没有把凭据写入仓库或日志。
