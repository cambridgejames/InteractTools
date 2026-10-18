# 路线图

## M0 基础设施

- [x] AGENTS.md、架构文档、ADR、扩展指南
- [x] .agents/skills 清单（加平台、加工具、设计审查、交付验证）
- [x] Git 初始化与首次提交
- [x] ESLint、依赖边界检查、设计 token 检查、CI

## M1 工程骨架

- [x] Electron + electron-vite + Vue + TypeScript
- [x] 主窗口、preload、类型化 IPC
- [x] 配置存储、历史存储与日志
- [x] 能启动并显示控制台

## M2 平台与内核

- [x] 标准化事件、PlatformHost、CommandBus、ToolHost
- [x] 本地模拟适配器（手动发送 + 自动机器人）
- [x] B站适配器：匿名弹幕、心跳、重连、brotli
- [x] 协议 fixture 测试
- [ ] B站真实连接验证（当前网络被 -352 风控拦截）
- [ ] 可选 SESSDATA 加密存储

## M3 骰子领域

- [x] 命令解析、去重、三种聚合
- [x] 状态机与倒计时
- [x] 历史记录
- [x] 表格驱动测试

## M4 物理

- [x] 六种骰子几何与凸包
- [x] cannon-es 模拟、停稳判定、结果读取
- [x] 固定 seed 单测
- [ ] 200 次分布冒烟脚本

## M5 结果窗口

- [x] 透明置顶窗口与主进程 Surface
- [x] Three.js 回放、结果卡、彩带
- [x] 自动关闭与预览
- [x] 冒烟截图

## M6 发布

- [x] Windows 安装包与免安装版构建
- [x] 打包后冒烟
- [x] 使用文档与故障排查
- [ ] 安装包实机安装验证
- [ ] OBS 窗口捕获验证
- [ ] 首个可直播版本
