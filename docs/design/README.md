# 设计说明

本目录只收**已经落地**的子系统：结构为什么是这样、有哪些不变量、改动时注意什么。尚未实施的方案在 [../roadmap/](../roadmap/README.md)；跨系统结构在 [../ARCHITECTURE.md](../ARCHITECTURE.md)。

文件落地后由 roadmap `git mv` 而来，不重写历史。格式见 [doc-convention](../../.agents/skills/doc-convention/SKILL.md)。

| 主题 | 文件 |
|---|---|
| 视觉语言：令牌、布局、组件状态、Do/Don't | [ui-guidelines.md](ui-guidelines.md) |
| 主题系统：dark / light / system、原生标题栏同步 | [theme.md](theme.md) |
| 动效规范：easing、时长、性能与 reduced motion | [motion.md](motion.md) |
| 网络：代理、直连域名、TLS、平台 probe | [network.md](network.md) |
| 日志：滚动、压缩、收集与等级 | [logging.md](logging.md) |
| 平台：只读适配器、统一事件、probe | [platforms.md](platforms.md) |
| 弹幕流：虚拟滚动、进场 ticker、未读提示 | [feed.md](feed.md) |
| 设置与操作指引：命名、分组、spotlight 流程 | [settings.md](settings.md) |
| 检查更新：GitHub Release、自动检查 / 下载、安装 | [updates.md](updates.md) |
