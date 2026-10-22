---
name: verify-app
description: 交付 1017 互动工坊改动前使用；按顺序跑类型、边界、测试、构建和 Electron 冒烟，并检查截图与日志。
---

# 交付验证

## 何时使用

任何准备提交或交给用户验收的改动，尤其是涉及 Electron 窗口、overlay、物理、平台连接时。

## 顺序

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run smoke
```

不要跳步。前一步失败时先修复，不要靠后一步「看起来能跑」掩盖。

## 检查项

### 静态

- [ ] 没有新增 `any`、`@ts-ignore`、`as any`。
- [ ] 没有跨层 import（lint 已覆盖）。
- [ ] @@npm run check:design@@ 通过，组件里没有裸颜色。
- [ ] 新组件在 `docs/design/DESIGN.md` 有对应规格。
- [ ] 新增公共类型有 JSDoc，注释解释「为什么」。
- [ ] 配置变更更新了 zod schema 与迁移。

### 测试

- [ ] 新增逻辑有测试；修 bug 有回归测试。
- [ ] 物理测试固定 seed，断言点数与帧数。
- [ ] 协议测试使用脱敏 fixture。

### 冒烟

- [ ] `artifacts/smoke/` 下有控制台与 overlay 截图。
- [ ] 控制台不是白屏，能看到平台状态与工具卡片。
- [ ] overlay 能看到骰子、结果数字，背景透明。
- [ ] 日志无 `console.error`、无 `render-process-gone`。
- [ ] 关闭窗口后进程退出，无残留。

### 人工

- [ ] 开始倒计时 → 发送力度 → 自动投掷 → 弹窗 → 自动关闭，全流程走通。
- [ ] 连续两次投掷不会复用上一次结果。
- [ ] 断网/停止模拟源时 UI 状态正确，不卡死。

## 报告

交付时写清：跑了哪些命令、截图路径、已知限制。失败就贴错误，不要只说「应该没问题」。
