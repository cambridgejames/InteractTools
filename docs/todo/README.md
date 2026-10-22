# 工程待办

只放被外部条件卡住、临时绕过或需要专门清理的事项。功能方案在 [../roadmap/](../roadmap/README.md)。

| # | 事项 | 触发条件 | 处理 |
|---|---|---|---|
| 1 | 浅色主题下 3D 骰桌仍为固定深色舞台 | 主播反馈浅色页面与骰桌割裂 | 评估是否给 Three.js 场景加浅色 palette；不阻塞主题 |
| 2 | 日志历史为 gzip，目录内不是逐日 zip | 用户需要直接按天取 zip | 在轮转回调里转 zip，或保持收集 zip |
| 3 | 抖音礼物真实样本未验证 | 有正在送礼的直播间 | 按 [real-douyin-gift](../roadmap/real-douyin-gift.md) 验证 |
| 4 | 操作指引依赖 DOM 选择器 | 设置控件改名/重排 | 同步更新 `OnboardingTour` 的 selector 并跑 smoke |
