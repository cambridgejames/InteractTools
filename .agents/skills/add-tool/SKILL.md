---
name: add-tool
description: 为 1017 互动工坊新增互动工具（命令驱动或主播手动）时使用；覆盖契约、状态机、呈现、控制台面板、注册与测试。
---

# 新增互动工具

## 何时使用

- 新增玩法（骰子、转盘、点歌、投票、答题）。
- 修改现有工具的命令、状态机或上屏表现。
- 要加一个**没有弹幕命令**、由主播手动触发的工具。

## 前置阅读

1. `AGENTS.md` 第 5–6 节。
2. `docs/architecture.md` 第 4.3–4.5、7 节。
3. `docs/guides/add-tool.md`。

## 步骤

1. 先决定形态：命令驱动（骰子）还是主播手动（转盘）。手动工具的 `commands` 是空数组，`handleChat` 永远返回 `false`。
2. 建 `src/tools/<id>/`：`manifest.ts`、`config.ts`、`domain/`、`tool.ts`。`manifest` 必须有 `id/name/description/version/icon/commands`。
3. 配置用 zod schema + 默认值；`activate(context, config)` 里解析，`updateConfig` 里重新解析。
4. 实现 `InteractionTool`；`view()` 带通用字段 `toolId/name/description/icon`，控制台才能渲染切换器。
5. 所有定时器走 `ToolContext.timer`；`deactivate` 清理并关闭呈现。
6. 需要上屏时在 `contracts/presentation.ts` 加 kind：动画放工具面板内，最终结果放 `ResultApp.vue` 原生结果窗；结果窗手动关闭。
7. 在 `contracts/view.ts` 的 `ToolView` 联合类型加 view；在 `contracts/config.ts` 与 `DEFAULT_APP_CONFIG` 加配置。
8. 在 `main/composition.ts` 注册 `new Tool()`。
9. **在 `control/tool-panels.ts` 注册 `id → 面板组件`**（新工具唯一必须手写的 UI 注册点），并新建 `components/<Tool>Panel.vue`；Dashboard 不用改。
10. 在 `ToolsView.vue` 加入口卡片；更新文案、文档、`docs/roadmap.md`。
11. 写测试：状态迁移、无命令工具不吞消息、配置校验、历史持久化、有上屏时 smoke 截图。

## 硬性要求

- 不 import 其他工具、`main`、`electron`。
- `view()` 只返回可结构化克隆的数据，并带通用字段。
- 不直接操作窗口；只调用 `present()`。
- 不在工具里读写磁盘；配置通过 `activate/updateConfig`，历史通过 `ToolContext.history`。
- 预期失败用 `Result`，不要用异常控制流程。
- 呈现数据必须足够完整，让面板/结果窗不需要再算业务结果（例如转盘只回放 `resultIndex`）。

## 验收

- [ ] `npm run typecheck`、`lint`、`test` 通过。
- [ ] 手动工具 `handleChat` 返回 `false`，不抢骰子命令。
- [ ] 重复开始/取消/超时都有测试；`deactivate` 后无定时器。
- [ ] 控制台工具切换器出现新工具，面板能配置与触发。
- [ ] 工具页有入口卡片。
- [ ] 有上屏时 `npm run smoke` 截图正常（骰子 + 转盘两类都看）。
