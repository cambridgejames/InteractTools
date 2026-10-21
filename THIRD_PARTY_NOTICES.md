# 第三方组件

## 抖音签名脚本

- 文件：`src/platforms/douyin/assets/sign.js`、`a_bogus.js`
- 来源：https://github.com/saermart/DouyinLiveWebFetcher
- 许可证：AGPL-3.0，全文见 `src/platforms/douyin/assets/LICENSE`
- 使用方式：通过 Node.js `vm` 执行，生成抖音只读连接的 WSS 签名；不修改脚本内容。
- 更新方式：抖音算法变更时替换脚本、更新本说明并发布新版本。

互动工坊自身代码仍按仓库根目录 `LICENSE` 发布；再分发安装包时必须同时保留本说明和上述 AGPL 许可证。
