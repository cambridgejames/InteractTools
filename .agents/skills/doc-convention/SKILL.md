---
name: doc-convention
description: 在本仓库新增、修订或迁移 docs/ 下的 Markdown 时使用；判定路线图与设计说明、套模板、写状态块与背景、维护索引，并在交稿前跑文档校验。
---

# 文档规范

## Summary

`docs/` 只回答两类问题：**还没做的事怎么做**（`docs/roadmap/`）和**已经落地的东西为什么是这样**（`docs/design/`）。跨子系统的结构归 `docs/ARCHITECTURE.md`，人的操作步骤归 `docs/usage.md`。写文档前先读 [docs/README.md](../../../docs/README.md)，不要凭记忆套格式。

硬性代码约定见 [AGENTS.md](../../../AGENTS.md)；视觉规范见 [ui-guidelines.md](../../../docs/design/ui-guidelines.md)。

## 标准流程

1. 读 [docs/README.md](../../../docs/README.md)、[docs/design/README.md](../../../docs/design/README.md)、[docs/roadmap/README.md](../../../docs/roadmap/README.md)。
2. 判定种类：未实施 → `roadmap`；已落地子系统 → `design`；跨系统结构 → `ARCHITECTURE.md`。
3. 用对应模板，按「状态块 → 背景 → 修改历史 → 正文」写。
4. 登记索引：设计文档进 `docs/design/README.md`，方案进 `docs/roadmap/README.md`。
5. 落地后 `git mv` 到 `docs/design/`，改状态，不删除、不重写历史。
6. 跑 `node scripts/check-docs.mjs`，再按交稿自检过一遍。

## 种类与模板

| 要说的 | 位置 | 模板 |
|---|---|---|
| 尚未实施的方案 | `docs/roadmap/<feature>.md` | [templates/roadmap.md](templates/roadmap.md) |
| 已落地子系统：结构、不变量、改动注意 | `docs/design/<subsystem>.md` | [templates/design.md](templates/design.md) |
| 跨系统结构：进程、分层、数据流 | `docs/ARCHITECTURE.md` | 无模板；结构真的变了才改 |
| 人的操作步骤 | `docs/usage.md` | 无模板；按操作顺序 |
| 工程性待办 | `docs/todo/` | 只写卡点与触发条件 |

文件名 kebab-case，与主题同名。一个主题一个文件。

## 事实规则

- 文档只写**代码今天的行为**；写进文档的默认值、数字、报错文案必须有代码或当次实测出处。
- 复现不了就删掉；依赖外部条件无法验证的，写明「未验证」和验证条件。
- 不把「计划做」写成「已经做」；未实施内容只放 `roadmap`。
- 修订旧文档前先读代码，不拿旧文档当证据。

## 写法

- 背景写 3–5 条编号：现场症状、约束、代价、不这么做会怎样。不写「提升体验」。
- 修改历史表三列 `| 日期 | 变更 | 原因 |`；新文档只有一行「首次定稿」。
- 正文只写结论：用 X 就写「这里用 X」，再写不变量与代价；不写候选方案辩护。
- 不重抄代码能表达的字段和流程；写边界、影响面、已知限制。
- 流程/时序用 mermaid，结构/目录用 ASCII；不贴外部截图。
- 全文中文；路径相对仓库根；标识符用反引号。
- 设计文档不引用 roadmap 文件；依赖其他子系统时给相对链接。

## 废料清单

交稿前删掉：

- 重复规则：同一事实只留一处，其余改链接。
- 越级历史：正文不写「哪一版改的」，历史只进修改历史表或提交信息。
- 状态注记：不要写「已实现」「待做」「以后会」；位置本身就是状态。
- 手抄清单：源码能列举的 IPC、目录、测试数量不要手写。
- 推理过程：不要复述实现步骤和测试走查，只留结论。

## 落地后的迁移

1. roadmap 状态改成 `已实施（提交 <短哈希>）`。
2. `git mv docs/roadmap/<feature>.md docs/design/<subsystem>.md`。
3. 从 roadmap README 删行，往 design README 加行。
4. 开头换成设计说明格式：`**状态**：现行架构`、`**最后更新**`，补修改历史。
5. 把「将要做」改成「现在是这样」。
6. 只有结构变化才动 `docs/ARCHITECTURE.md`。

## 交稿前自检

- [ ] 种类正确，未实施内容没有混进 `design/`
- [ ] 状态块、背景、修改历史齐全（设计文档）
- [ ] 两处 README 索引与实际文件一致
- [ ] 相对链接和锚点能打开
- [ ] 没有重复规则、越级历史、状态注记、手抄清单
- [ ] 行内代码使用反引号，没有占位符
- [ ] `node scripts/check-docs.mjs` 通过
