# ADR-0001：模块化单体，而不是 npm workspaces

- 状态：已接受
- 日期：2026-10-18

## 背景

项目需要清晰的平台/工具扩展边界，同时是 Electron 桌面应用，构建链包含 electron-vite、Vue、Three.js、cannon-es。拆成多个 workspace 包可以提高物理隔离，但会增加构建顺序、类型引用、打包 externalize 的复杂度。

## 决策

采用**模块化单体**：单个 `package.json`，内部按 `contracts / kernel / platforms / tools / main / renderer` 分层，用路径别名和 ESLint 依赖边界规则强制隔离。

## 后果

- 一次 `npm install`、一次 `electron-vite build`，打包脚本简单。
- 边界由 lint 而不是 package.json 保证；违反会直接报错。
- 未来要拆包时，把目录移到 `packages/` 并保留别名即可，业务 import 不变。
- 代价是单仓库类型检查范围较大；通过 `tsconfig` 分 project 和增量检查控制。
