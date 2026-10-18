# 路线图

## M0 基础设施（当前）

- [x] AGENTS.md、架构文档、ADR、扩展指南
- [x] .agents/skills 三份清单
- [ ] Git 初始化与首次提交
- [ ] ESLint 边界规则、CI

## M1 工程骨架

- [ ] Electron + electron-vite + Vue + TypeScript
- [ ] 主窗口、preload、类型化 IPC
- [ ] 配置存储与日志
- [ ] 能启动并显示空控制台

## M2 平台与内核

- [ ] 标准化事件、PlatformHost、CommandBus、ToolHost
- [ ] 本地模拟适配器（手动发送 + 自动机器人）
- [ ] B站适配器：匿名弹幕、心跳、重连、brotli
- [ ] 协议 fixture 测试

## M3 骰子领域

- [ ] 命令解析、去重、三种聚合
- [ ] 状态机与倒计时
- [ ] 历史记录
- [ ] 表格驱动测试

## M4 物理

- [ ] 六种骰子几何与凸包
- [ ] cannon-es 模拟、停稳判定、结果读取
- [ ] 固定 seed 单测
- [ ] 分布冒烟脚本

## M5 结果窗口

- [ ] 透明置顶窗口与主进程 Surface
- [ ] Three.js 回放、结果卡、彩带
- [ ] 自动关闭与预览
- [ ] 冒烟截图

## M6 发布

- [ ] Windows 安装包与免安装版
- [ ] OBS 窗口捕获验证
- [ ] 使用文档与故障排查
- [ ] 首个可直播版本
