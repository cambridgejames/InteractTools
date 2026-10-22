# 日志子系统

- 实现：winston + winston-daily-rotate-file，主进程 `src/main/services/logger.ts`。
- 目录：`userData/logs/interact-YYYY-MM-DD.log`。
- 滚动：按天 + 单文件 20MB；旧文件压缩；最多保留 20 个历史文件。
- 行格式：`YYYY-MM-DD HH:mm:ss.SSS LEVEL process scope message | detail`。
- 等级：debug / info / warn / error，默认 info；设置页可改并提示 Debug 的代价。
- 收集：设置 → 数据 → 收集日志，打包为 `logs/exports/interact-logs-*.zip`，打开所在文件夹。
- 约束：不记录 cookie/token/SESSDATA、代理密码和完整带凭据 URL。

关键位置：启动、配置载入、网络配置、平台连接/断开、工具动作、配置保存、日志等级变更、主题应用。
