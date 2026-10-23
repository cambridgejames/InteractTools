# 检查更新与安装

**状态**：现行架构
**最后更新**：2026-10-24

---

## 1. 背景

1. 0.1.0 没有版本提示，用户只能自己来仓库看 Release。
2. 手动下载后怎么安装、是否覆盖配置，需要一个成熟机制，而不是自建下载器。
3. 自动检查与自动下载是两种不同风险，不能合并成一个开关。
4. GitHub API 在某些网络下也需要代理，连通性测试应覆盖它。

### 1.1 修改历史

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-10-23 | 首次定稿 | 接入 release-please、GitHub Release 检查与 electron-updater |
| 2026-10-24 | 补充 zip 更新 | 支持解压运行的 Windows 版本下载 zip 并在退出后覆盖 |

---

## 2. 结构

```
release-please（main）→ 版本 PR（package.json + CHANGELOG）→ 合并后 v* tag
       ↓
release.yml → 三平台构建 → release-notes.mjs → GitHub Release + latest*.yml
       ↓
应用启动 → UpdateService.check()
  → GitHub API /releases/latest
  → 与 app.getVersion() 比较
  → 顶部提示 / 设置 → 关于 → 更新
       ↓
electron-updater（仅安装包）→ 下载 → update-downloaded → 重启安装
       ↳ zip/便携解压版 → 下载 zip → 退出后 PowerShell 解压覆盖 → 重启
```

## 3. 关键规则

- GitHub Release 是版本事实源；当前版本来自 `app.getVersion()`，不读 package.json 的 dev 值。
- 默认自动检查开启，自动下载关闭，安装永远需要用户确认；`autoInstallOnAppQuit` 只负责退出时安装已下载包。
- 开发模式不下载安装包；点下载打开 Release 页面。
- 自动检查失败不打断主流程，只在「关于 → 更新」显示错误。
- GitHub 连通性由 `probeGitHub` 单独加入网络测试，不伪装成平台适配器。
- 下载包必须带 `latest*.yml` 与 blockmap；release workflow 负责上传。
- Windows Release 同时上传 zip；从 zip 解压运行的版本由 `zip-update.ts` 更新：下载当前架构的 zip、校验可选 sha256 digest、退出后由独立 PowerShell 等待进程退出并解压覆盖。
- zip 更新只在 Windows、目录可写且没有 `Uninstall*.exe` 时启用；NSIS 仍走 electron-updater，便携单文件版不进入 zip 目录替换。
- zip 更新失败只影响更新卡片，不删用户数据，也不阻塞直播。

## 4. 改动时的检查点

- 新平台/新架构是否进入 release 矩阵与更新元数据？
- 手动检查是否仍然比较 GitHub 最新 Release，而不是只调 electron-updater？
- 自动检查/自动下载开关是否保持独立？
- 版本标签是否由 release-please 生成，并与 package.json 一致？
- 下载失败是否只影响更新卡片，不影响直播？

## 5. 已知取舍

| 取舍 | 代价 |
|---|---|
| GitHub Release API 无 token | 受 60 次/小时匿名限流 |
| 依赖 electron-updater | macOS 正式分发仍需要签名/公证，CI 只做无签名包 |
| 自动下载默认关闭 | 用户需要多点一次，但不会在直播中突然占带宽 |
