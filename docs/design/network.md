# 网络与平台探测

**状态**：现行架构
**最后更新**：2026-10-22

---

## 1. 背景

1. 直播平台接口在部分网络下必须走代理；早期只测 B站，抖音失败时无法从设置页判断。
2. 代理认证和自签名证书在内网/公司网络里常见，缺失会让平台连接直接失败。
3. 平台数量会继续增加，测试逻辑不能每加一个平台就改一次设置页。

### 1.1 修改历史

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-10-22 | 首次定稿 | 按平台 probe、代理认证、直连域名与 TLS 开关落地 |

---

## 2. 结构

```
NetworkConfig（config.json）
  → NetworkProxy（解析/应用）
  → NetworkProxyInfo { proxyUrl, allowInsecureTls, bypass }
  → 平台 HTTP / WSS / probe
  → PlatformHost.probeAll()
  → network:test → 设置页图标
```

- `none`：直连。
- `system`：`session.resolveProxy` 解析。
- `custom`：地址 + 用户名 + 密码，支持直连域名。
- 每个 `PlatformAdapterFactory` 可选实现 `probe(config, context)`。

## 3. 关键规则

- 直连域名匹配精确域名与 `.suffix` 后缀；Electron session 用 `proxyBypassRules`，平台请求用 `proxyUrlFor`。
- `allowInsecureTls` 只影响平台请求/探测，不改 Node 全局 TLS。
- 探测并行、10 秒超时；有平台成功就 `ok:true`，每个平台独立显示状态与延迟。
- 日志只记代理模式/结果，不记录密码与带凭据 URL。

## 4. 改动时的检查点

- 新平台是否实现 `probe`？否则网络页不会出现它。
- HTTP 与 WSS 是否都使用 `proxyUrlFor` 与 TLS 开关？
- 代理 URL 是否在 UI 与日志中脱敏？
- 系统代理模式是否仍允许直连域名？

## 5. 已知取舍

| 取舍 | 代价 |
|---|---|
| 探测平台首页/公开接口而非完整 WSS 握手 | 快，但可能漏掉只有 WSS 被拦的网络 |
| 自签名开关是全局的 | 不能按平台单独信任某张证书 |
