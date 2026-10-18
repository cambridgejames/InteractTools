# 新增互动工具

工具是玩法的最小单位，可以独立启用、停用、配置。本文用「转转盘」这种**没有弹幕命令**的工具做参照；骰子是另一种「命令驱动」的参照。

## 1. 设计边界

工具负责：配置解析、命令解析、领域状态、调用算法/物理、产生呈现数据。
工具不负责：窗口、IPC、平台连接、磁盘读写。

允许依赖：`contracts`、本工具 `domain/physics`。禁止 import 其他工具、`main`、`electron`。

## 2. 建文件

```
src/tools/example/
  manifest.ts       # id、名称、描述、版本、icon、commands
  config.ts         # 配置类型 + zod schema + 默认值（也可放 contracts）
  domain/           # 纯函数：解析、聚合、状态迁移
  tool.ts           # 实现 InteractionTool
```

有物理/复杂算法时单独放 `physics/`；展示字段直接塞进 `view()`，不必单独建 view.ts。

## 3. 实现契约

```ts
export class ExampleTool implements InteractionTool {
  readonly manifest = exampleManifest

  private context: ToolContext | null = null
  private config: ExampleConfig = DEFAULT_EXAMPLE_CONFIG
  private phase: 'idle' | 'running' | 'result' = 'idle'

  async activate(context: ToolContext, config: unknown): Promise<void> {
    this.context = context
    this.config = exampleConfigSchema.parse(config ?? DEFAULT_EXAMPLE_CONFIG)
    context.notifyChange()
  }

  async updateConfig(config: unknown): Promise<void> {
    this.config = exampleConfigSchema.parse(config)
    this.notify()
  }

  async deactivate(): Promise<void> {
    this.context?.timer.clearAll()
    await this.context?.present({ kind: 'dismiss', toolId: 'example' })
    this.context = null
  }

  async handleChat(_message: ChatMessage): Promise<boolean> {
    return false // 没有弹幕命令的工具必须明确让给下一个工具
  }

  async handleAction(action: ToolAction): Promise<void> {
    if (action.type === 'start') await this.run(true)
  }

  view(): ExampleToolView {
    return {
      toolId: 'example',
      name: this.manifest.name,
      description: this.manifest.description,
      icon: this.manifest.icon,
      phase: this.phase
    }
  }
}
```

要点：

- `activate` 才拿到 `ToolContext`，构造函数里不要存 context。
- `ToolView` 必须带 `toolId / name / description / icon`，控制台靠这些字段渲染通用工具切换器。
- 内部数组/对象在 `view()` 里复制，不暴露引用。

## 4. 有命令 vs 没命令

**有命令**（骰子）：

- 解析函数放 `domain/`，返回判别联合或 `null`。
- 非法值返回明确原因；未命中返回 `false`。
- 按 `platform:userId` 去重；骰子取最后一条。

**没命令**（转盘）：

- `manifest.commands = []`。
- `handleChat` 永远返回 `false`。
- 只通过 `handleAction` 由主播/控制台触发。
- 不要为了「统一」硬塞一个假命令；工具框架本来就支持两种形态。

## 5. 状态与定时器

- 用 `ToolContext.timer` 创建定时器，`deactivate` 时统一清理。
- 状态迁移写成纯函数或 reducer，便于表格驱动测试。
- 每次异步呈现/定时器回调都检查 `generation`，防止取消后旧回调改状态。

## 6. 呈现

需要上屏时：

1. 在 `contracts/presentation.ts` 增加 `kind` 与 payload 类型。
2. 在 overlay 的 `OverlayApp.vue` 加一个分支（例如 `WheelOverlay`）。
3. 在 `main/windows/overlay-window.ts` 的安全关闭逻辑里加时长计算。
4. 提供 `autoCloseSeconds`，避免窗口堆积。

呈现数据要足够完整，让 overlay 不需要再算业务结果。转盘的 `resultIndex` 由主进程选出，overlay 只负责把该格转到指针下。

## 7. 注册清单（少一步 UI 就看不到）

1. **契约**：`contracts/view.ts` 的 `ToolView` 联合类型加新 view；`contracts/config.ts` 的 tools schema 加配置；`DEFAULT_APP_CONFIG` 加默认值。
2. **组合根**：`main/composition.ts` 的 `tools` 数组加 `new ExampleTool()`。
3. **控制台面板**：新建 `components/ExamplePanel.vue`，在 `control/tool-panels.ts` 注册 `id → 组件`。这是唯一必须手写的 UI 注册点，Dashboard 本身不用改。
4. **工具页**：`ToolsView.vue` 加一张卡片（可选，但用户需要入口）。
5. **呈现**：有上屏时按第 6 节加 overlay 分支。
6. **测试**：至少覆盖状态机、无命令工具不吞消息、配置校验、历史持久化。

## 8. 测试

- 状态机：开始/取消/超时/重复开始/停稳。
- 无命令工具：`handleChat` 必须返回 `false`。
- 配置：合法值、边界值、旧配置缺字段能回落默认。
- 视图：可结构化克隆，不含 class、函数、Map。
- 有物理：固定 seed 断言结果与帧数。
- 有上屏：`npm run smoke` 加一张截图。

## 9. 检查清单

- [ ] manifest 的 commands 与真实解析一致；无命令就是空数组。
- [ ] `handleChat` 未命中返回 `false`，不吞别人的命令。
- [ ] `deactivate` 清空定时器与未完成呈现。
- [ ] `view()` 带 toolId/name/description/icon。
- [ ] 配置有 zod schema 与默认值，旧配置可迁移。
- [ ] `control/tool-panels.ts` 有对应面板注册。
- [ ] 有上屏时 overlay 有对应分支 + 冒烟截图。
- [ ] 文档、UI 文案、测试同步。
