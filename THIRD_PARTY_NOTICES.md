# 第三方组件

## HarmonyOS Sans

- 文件：`src/renderer/src/assets/fonts/HarmonyOS_SansSC_Regular.ttf`
- 来源：Huawei Device Co., Ltd. HarmonyOS Sans
- 许可证：HarmonyOS Sans Fonts License Agreement，全文见 `src/renderer/src/assets/fonts/HarmonyOS_SANS_LICENSE.txt`
- 使用方式：作为界面字体原样嵌入，不修改字体文件；版权归华为所有。

## 抖音签名脚本

- 文件：`src/platforms/douyin/assets/sign.js`、`a_bogus.js`
- 来源：https://github.com/saermart/DouyinLiveWebFetcher
- 许可证：AGPL-3.0，全文见 `src/platforms/douyin/assets/LICENSE`
- 使用方式：通过 Node.js `vm` 执行，生成抖音只读连接的 WSS 签名；不修改脚本内容。
- 更新方式：抖音算法变更时替换脚本、更新本说明并发布新版本。

互动工坊自身代码仍按仓库根目录 `LICENSE` 发布；再分发安装包时必须同时保留本说明和上述 AGPL 许可证。
