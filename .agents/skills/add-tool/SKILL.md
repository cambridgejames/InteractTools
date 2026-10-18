---
name: add-tool
description: 为 1017 互动工坊新增互动工具或修改工具状态机时使用；覆盖契约、命令、状态、呈现、注册与测试。
---

# 新增互动工具

## 何时使用

- 新增玩法（转盘、点歌、投票、答题）。
- 修改现有工具的命令、状态机或上屏表现。

## 前置阅读

1. `AGENTS.md` 第 5–6 节。
2. `docs/architecture.md` 第 4.3–4.5、7 节。
3. `docs/guides/add-tool.md`。

## 步骤

1. 写清状态机：有哪些阶段、谁能触发、超时与取消怎么走。
2. 建 `src/tools/<id>/`：`manifest.ts`、`config.ts`、`domain/`、`tool.ts`、`view.ts`。
3. 命令解析放 `domain/`，返回判别联合；非法输入有明确原因。
4. 实现 `InteractionTool`；`handleChat` 未命中返回 `false`。
5. 所有定时器走 `ToolContext.timer`，`deactivate` 清理。
6. 需要上屏时在 `contracts/presentation.ts` 加 kind，并在 SurfaceHost 注册。
7. 在 `contracts/view.ts` 加 view 类型，在 `main/composition.ts` 注册工具。
8. 写表格驱动测试：命令、去重、边界、状态迁移。
9. 更新 UI 文案、文档和 `docs/roadmap.md`。

## 硬性要求

- 不 import 其他工具、`main`、`electron`。
- `view()` 只返回可结构化克隆的数据。
- 不直接操作窗口；只调用 `present()`。
- 不在工具里读写磁盘；配置通过 `ToolConfigHandle`。
- 预期失败用 `Result`，不要用异常控制流程。
- 呈现数据必须包含足够信息，让 overlay 不需要再计算业务结果。

## 验收

- [ ] `npm run typecheck`、`lint`、`test` 通过。
- [ ] 重复开始、取消、超时都有测试。
- [ ] `deactivate` 后无定时器残留。
- [ ] 工具页能自动出现新卡片，开关与配置生效。
- [ ] 有上屏时 `npm run smoke` 截图正常。
