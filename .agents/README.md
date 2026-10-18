# .agents

存放 AI 协作者的可执行清单。与 `AGENTS.md` 的分工：

- `AGENTS.md` 是长期约束：架构、规范、完成定义。
- 这里的 skill 是具体任务的步骤：加平台、加工具、交付验证。

## 结构

```
.agents/skills/<name>/SKILL.md
```

每个 `SKILL.md` 带 YAML frontmatter：

```yaml
---
name: add-tool
description: 一句话说明何时使用
---
```

## 维护

- 步骤必须能直接执行，不写「注意规范」这类空话。
- 代码路径、命令、文件名变化时同步更新，否则 skill 会误导下一个协作者。
- 新增 skill 要在 `AGENTS.md` 第 7 节登记。
