# 新增互动工具

本文以 `example` 工具为例。工具是玩法的最小单位，可以独立启用、停用、配置。

## 1. 设计边界

工具负责：命令解析、领域状态、调用物理/算法、产生呈现数据。
工具不负责：窗口、IPC、平台连接、磁盘读写。

允许依赖：`contracts`、本工具 `domain/physics`。禁止 import 其他工具或 `main`。

## 2. 建文件

```
src/tools/example/
  manifest.ts       # id、名称、命令、版本
  config.ts         # 配置类型 + zod schema + 默认值
  domain/           # 纯函数：解析、聚合、状态迁移
  tool.ts           # 实现 InteractionTool
  view.ts           # 生成 ToolView
```

如果工具有物理或复杂算法，单独放 `physics/` 或 `engine/`，不要把数学塞进 `tool.ts`。

## 3. 实现契约

```ts
export class ExampleTool implements InteractionTool {
  readonly manifest = exampleManifest;

  constructor(
    private readonly context: ToolContext,
    private readonly clock: Clock,
  ) {}

  async activate(context: ToolContext): Promise<void> {
    this.context = context;
    this.context.publish({ type: 'snapshot', snapshot: this.context.engineSnapshot() });
  }

  async deactivate(): Promise<void> {
    this.context.timer.clearAll(this.timerScope);
  }

  async handleChat(message: ChatMessage): Promise<boolean> {
    const command = parseExampleCommand(message.text);
    if (command === null) return false;

    this.apply(command, message);
    return true;
  }

  async handleAction(action: ToolAction): Promise<void> {
    // 校验 action.payload（zod），再执行。
  }

  view(): ExampleToolView {
    return {
      toolId: 'example',
      enabled: true,
      phase: this.phase,
    };
  }
}
```

## 4. 命令解析

- 解析函数放在 `domain/`，输入字符串，输出判别联合或 `null`。
- 支持全角冒号、可选前缀、大小写；不要用一大坨正则硬猜。
- 非法值返回明确的失败原因，交给工具决定记日志还是忽略。
- 同一用户的重复指令按产品规则去重（骰子是取最后一条）。

## 5. 状态与定时器

- 用 `ToolContext.timer` 创建定时器，`deactivate` 时统一清理。
- 状态迁移写成纯函数或 reducer，便于表格驱动测试。
- 所有对外 `view()` 必须是新对象，不暴露内部数组引用。

## 6. 呈现

如果工具需要上屏：

1. 在 `contracts/presentation.ts` 增加一个 `kind` 与 payload 类型。
2. 在 `main/surfaces/` 注册对应窗口/页面。
3. overlay 渲染进程按 `kind` 分支处理。
4. 提供关闭与自动关闭策略，避免窗口堆积。

没有上屏需求就不要加 presentation。

## 7. 注册

在 `main/composition.ts` 构造工具并注册到 `ToolHost`；在 `contracts/view.ts` 的 `ToolView` 联合类型中加入新的 view。UI 的工具页按 manifest 自动生成卡片。

## 8. 测试

- 命令解析：合法、非法、边界值、全角字符。
- 状态机：开始/取消/超时/重复开始。
- 去重与聚合：同一用户多条、不同平台同 id。
- 视图：序列化后不含不可克隆对象。
- 若有物理：固定 seed 断言结果与帧数。

## 9. 检查清单

- [ ] manifest 的 commands 与真实解析一致。
- [ ] `handleChat` 未命中返回 `false`，不吞掉别人的命令。
- [ ] `deactivate` 清空定时器与未完成呈现。
- [ ] `view()` 可结构化克隆，不含 class、函数、Map。
- [ ] 配置有 zod schema 与默认值，旧配置可迁移。
- [ ] 文档、UI 文案、测试同步。
