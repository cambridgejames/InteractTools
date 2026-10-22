# 平台适配器

**状态**：现行架构
**最后更新**：2026-10-22

---

## 1. 背景

1. B站、抖音和本地模拟的协议完全不同，但工具只应该看到统一事件。
2. 平台能力只读，不能因为接入聊天就获得发送能力。
3. 新增平台不应改内核或设置页；连通性测试也要自动覆盖。

### 1.1 修改历史

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-10-22 | 首次定稿 | 统一事件、只读边界、factory.probe |

---

## 2. 结构

```
PlatformAdapterFactory
  descriptor / configSchema / create / probe?
        │
PlatformAdapter
  connect(config, signal) / disconnect() / status
        │
PlatformEvent { status | chat | gift | member }
        │
Engine → feed / recentMembers / CommandBus
```

- B站：匿名 WBI + WSS。
- 抖音：随包签名资产 + WSS，protobuf 解析 chat/gift/member。
- mock：本地定时事件，不联网。

## 3. 关键规则

- 只读：没有发送弹幕、礼物、关注、点赞的接口。
- `disconnect` 幂等；手动断开后不自动重连。
- 单条消息解析失败不能丢整帧其他消息。
- 新平台实现 `probe` 才进入网络测试。
- 平台差异留在 platform 层，Engine 只消费统一事件。

## 4. 改动时的检查点

- 是否引入 kernel/tools/electron 依赖？
- 是否在日志/配置里写入 cookie 或 token？
- 是否处理 gzip、多包、AbortSignal？
- 是否有脱敏 fixture 测试？

## 5. 已知取舍

| 取舍 | 代价 |
|---|---|
| 匿名 B站，不登录 | 收不到仅登录可见的互动 |
| 抖音签名资产随版本发布 | 算法变更必须发版 |
