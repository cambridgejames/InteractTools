# 主题系统

**状态**：现行架构
**最后更新**：2026-10-22

---

## 1. 背景

1. 早期只有深色一套变量，颜色散落在组件里，加浅色只能逐页改。
2. 直播场景常在白天/明亮环境使用，纯黑界面在某些显示器上发灰。
3. 用户希望跟随系统，而不是每次手动切。
4. 原生最小化/最大化/关闭按钮由 Electron overlay 绘制，不跟 CSS 自动变色。

### 1.1 修改历史

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-10-22 | 首次定稿 | 引入 dark/light/system 与原生窗口同步 |

---

## 2. 结构

- 配置：`config.ui.theme`，取值 `dark` / `light` / `system`，默认 `dark`。
- CSS：`:root[data-theme='dark']` 与 `:root[data-theme='light']` 两套 token，组件只消费 `var(--...)`。
- 渲染进程：`App.vue` 的 `applyTheme()` 解析 system，写 `document.documentElement.dataset.theme`，并向主进程发送 resolved。
- 主进程：`theme:apply` 设置 `nativeTheme.themeSource`（system 保持 `system`），调用 `ControlWindow.applyTheme()` 换 overlay 与窗口背景。

## 3. 关键规则

- system 模式以 `matchMedia('(prefers-color-scheme: dark)')` 为准，监听 `change`，不刷新窗口。
- 只有 resolved 主题用于 CSS；`system` 不写进 `data-theme`。
- Windows/Linux 原生按钮：dark `#0b0d10/#f2f4f1`，light `#ffffff/#161a13`。
- 3D 骰桌是固定演播室场景，不随主题变白；结果卡与文字仍走 token。
- 浅色强调色用深橄榄 `#5c7800`，避免荧光绿在白底失去对比度。

## 4. 改动时的检查点

- 新组件是否只用了 token？`npm run check:design` 会拒绝裸 `#hex/rgb/rgba`。
- 新颜色是否同时补 dark 与 light？只加一套会让另一套失真。
- 系统切换时是否同时更新 CSS 与原生按钮？只改 CSS 会留下深色窗口按钮。
- 弹窗/结果卡/下拉浮层是否也跟随主题？它们不一定继承父级。

## 5. 已知取舍

| 取舍 | 代价 |
|---|---|
| system 交给 Electron 的 `nativeTheme`，CSS 自己解析 | 两处状态需要保持同步，改主题入口必须同时经过 `applyTheme` |
| 浅色不放大量半透明玻璃 | 立体感弱于深色，要靠边框与留白 |
