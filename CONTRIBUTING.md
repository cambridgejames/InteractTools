# 贡献指南

> **English summary**: Issues and pull requests in English are welcome. The project is maintained in Chinese; the maintainer will translate as needed. See [README.en.md](./README.en.md).

感谢你愿意为互动工坊出力。开始之前，请先读完本文和 [AGENTS.md](./AGENTS.md)——后者写清了分层规则、代码规范与交付前的自检清单，对人和 AI 一视同仁。

参与本项目即表示你同意遵守 [行为准则](./CODE_OF_CONDUCT.md)。

---

## 环境准备

| 要求 | 版本 |
| --- | --- |
| Node.js | **≥ 22.12.0** |
| npm | 随 Node 安装 |
| 操作系统 | Windows / macOS / Linux；当前主要验证 Windows |

~~~bash
git clone https://github.com/cambridgejames/interact-tools.git
cd interact-tools
npm install
npm run dev
~~~

本仓库使用 `package-lock.json`，提交前不要混入其他包管理器的锁文件。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发模式（Electron + Vite HMR） |
| `npm run typecheck` | 主进程 / 渲染进程类型检查 |
| `npm run lint` | ESLint + 依赖边界 + 设计 token |
| `npm run test` | Vitest 单测 |
| `npm run build` | 类型检查 + electron-vite 构建 |
| `npm run smoke` | 构建后启动 Electron，截图到 `artifacts/smoke` |
| `npm run package:win` | Windows 安装包，产物在 `release/` |

## 开发流程

1. Fork 仓库，从 `master`（或仓库当前主分支）切出特性分支，例如 `feat/wheel-presets`。
2. 阅读 [AGENTS.md](./AGENTS.md) 与相关模块文档；UI 改动先读 [DESIGN.md](./DESIGN.md)。
3. 修改代码和测试；新增或修改逻辑必须有对应测试。
4. 跑完下面的自检清单。
5. 提交 PR，说明动机、行为和验证方式。

主分支是 `master`；如果仓库迁移到 `main`，CI 与发布工作流同时接受两者。日常开发不建议直接推主分支。

### 提交信息

使用 Conventional Commits，scope 用目录名或工具名：

~~~
feat(wheel): save named presets
fix(bilibili): refresh WBI once on -352
docs(adr): record in-app result overlay decision
~~~

一次提交只做一件事；格式化与逻辑改动分开。

## 自检清单

交付前至少运行：

~~~bash
npm run typecheck
npm run lint
npm run test
npm run build
~~~

涉及界面时再运行 `npm run smoke`，确认无白屏、无未处理报错；涉及打包配置时运行 `npm run package:win` 并执行打包后冒烟。

文档与实现必须同步：契约变更更新 `docs/architecture.md`，玩法变更更新 `docs/usage.md`，视觉变更遵循 `DESIGN.md`，并在 `CHANGELOG.md` 的 `[Unreleased]` 段补条目。

## 分支与发布

| 分支/标签 | 用途 |
| --- | --- |
| `master` | 稳定分支；自动发布只接受指向它的 tag |
| `v0.1.0` 这类 tag | 触发 GitHub Actions 构建 Windows 安装包并创建 Release |

发布由维护者执行：更新 `package.json` 版本与 CHANGELOG → 合并到主分支 → 打 `v<version>` tag 并推送。
[release.yml](.github/workflows/release.yml) 会校验 tag 指向主分支、tag 与 package 版本一致，然后打包并发布。

## 代码规范

完整规范见 [AGENTS.md](./AGENTS.md)。最容易踩的几条：

1. 依赖方向：`contracts ← kernel ← platforms/tools ← main`，渲染进程只通过 preload 访问能力。
2. 禁止 `any`；边界用 `unknown` + zod。
3. 预期失败用 `Result<T, E>`；异常只用于违反不变量。
4. 标识符英文，注释与文档中文；注释解释“为什么”，不逐行复述。
5. UI 只使用 `tokens.css` 的变量，不在组件里写死颜色、圆角、字体。
6. 不提交 cookie、token、SESSDATA 或房间凭据。

## 报告问题

- 缺陷：[Bug 模板](.github/ISSUE_TEMPLATE/bug_report.yml)
- 功能建议：[Feature 模板](.github/ISSUE_TEMPLATE/feature_request.yml)
- 安全问题：不要开公开 Issue，见 [SECURITY.md](./SECURITY.md)
