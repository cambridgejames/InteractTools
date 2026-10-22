# 平台适配器

- 统一事件：status / chat / gift / member。
- 只读：没有发送弹幕、礼物、关注、点赞接口。
- B站使用匿名 WBI + WSS；抖音使用本地签名资产 + WSS；mock 不联网。
- 平台工厂负责 descriptor、configSchema、create，以及可选的 probe。
- 平台差异留在 platform 层，引擎只消费统一事件。

协议字段变化时优先加 fixture 测试；抖音单条消息解析失败不能丢弃同帧其他消息。
