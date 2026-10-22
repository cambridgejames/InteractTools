# 文档地图

每个事实只有一个家：先在这里找到位置，再动笔。写得对不对由 [doc-convention](../.agents/skills/doc-convention/SKILL.md) 约束，链接、编码、索引由 `node scripts/check-docs.mjs` 检查。

## 层级

| 层级 | 放什么 | 不放什么 |
|---|---|---|
| [README.md](../README.md) | 项目简介、启动方式、当前能力 | 实现方案（→ `roadmap/`、`design/`） |
| [AGENTS.md](../AGENTS.md) | 每次会话都要在场的命令、目录与硬性不变量 | 过程步骤（→ `.agents/skills/`）、背景理由（→ `design/`） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 跨子系统的结构：进程、分层、IPC、数据流 | 单个子系统的细节（→ `design/`） |
| [design/](design/README.md) | **已经落地**的子系统：为什么是这样、不变量、改动注意 | 尚未实施的方案（→ `roadmap/`） |
| [design/ui-guidelines.md](design/ui-guidelines.md) | 视觉语言、令牌、组件状态、布局规则 | 具体页面实现（→ 代码与 `usage.md`） |
| [roadmap/](roadmap/README.md) | **尚未实施**的方案与验证计划 | 已经落地的事实（落地后 `git mv` 到 `design/`） |
| [todo/](todo/README.md) | 被外部条件卡住、临时绕过的工程待办 | 功能方案（→ `roadmap/`） |
| [usage.md](usage.md) | 面向主播的操作步骤与排障 | 设计理由（→ `design/`） |
| [testing.md](testing.md) | 测试分层、fixture 与本地验收 | 单次测试结果（→ `verification.md`） |
| [verification.md](verification.md) | 最近一次实机/冒烟验证记录 | 长期设计事实（→ `design/`） |
| [guides/](guides/) | 可重复的扩展步骤（新增平台/工具） | 常驻规则（→ `AGENTS.md`） |
| [adr/](adr/) | 已经做出的架构决策 | 教程与操作步骤（→ `guides/`、`usage.md`） |
| [.agents/skills/](../.agents/skills/) | 按需加载的工作流与判据 | 常驻约定（→ `AGENTS.md`） |

## 写法

- 未实施 → `roadmap`；已落地 → `design`。不要在同一篇里混合两种语气。
- 每篇设计文档开头必须有 `**状态**`、`**最后更新**`、背景与修改历史。
- 正文只写结论和不变量；不重抄代码，不写候选方案辩护。
- 流程用 mermaid，结构用 ASCII，不贴外部截图。
- 落地后 `git mv`，不删除、不重写 Git 历史。

## 校验

```bash
npm run check:docs
```

检查 UTF-8/BOM、相对链接与锚点、设计/roadmap 索引、skill frontmatter、占位符；已接入 `npm run lint` 与 CI。
