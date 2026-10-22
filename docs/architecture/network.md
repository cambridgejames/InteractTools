# 网络子系统

## 分层

`NetworkProxy` 只负责把用户配置解析成最终代理 URL，并同步 Electron session：
- none：直连
- system：`resolveProxy` 解析系统代理
- custom：HTTP/HTTPS 地址 + 用户名/密码 + 直连域名

## 平台请求

- `NetworkProxyInfo` 暴露 proxyUrl、allowInsecureTls、bypass。
- `proxyUrlFor(url, network)` 负责精确域名/后缀直连匹配。
- B站、抖音的 HTTP 与 WSS 都使用同一份网络信息。
- 自签名证书开关只影响平台请求和探测，不修改 Node 全局 TLS。

## 平台探测

每个 `PlatformAdapterFactory` 可实现 `probe(config, context)`。`PlatformHost.probeAll` 并行执行，返回 platformId/name/ok/latency/message；网络设置页按平台显示图标。新增平台只要实现 probe 就自动进入测试。

## 安全

- 不把代理密码写日志。
- 日志只记录代理模式、结果和延迟，不记录完整 URL 凭据。
