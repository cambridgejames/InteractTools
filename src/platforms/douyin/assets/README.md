# 抖音签名资产

本目录是抖音只读连接使用的第三方运行时资产，不属于互动工坊 MIT 代码。

| 文件 | 用途 | 来源 |
| --- | --- | --- |
| `sign.js` | 生成 webcast WSS signature | [saermart/DouyinLiveWebFetcher](https://github.com/saermart/DouyinLiveWebFetcher) |
| `a_bogus.js` | HTTP 接口 a_bogus（备用） | 同上 |

上游采用 **AGPL-3.0**，许可证全文见同目录 `LICENSE`。这些文件通过 Node `vm` 作为独立脚本执行，不修改其内容；应用只读取生成的签名。

抖音变更算法时，替换 `sign.js` / `a_bogus.js`，更新本说明和版本号后重新打包。不要在这里写入 cookie、token 或房间凭据。
