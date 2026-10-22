---
name: add-platform
description: 为 1017 互动工坊新增或修改直播平台适配器时使用；覆盖契约、注册、配置、协议测试与验收清单。
---

# 新增平台适配器

## 何时使用

- 接入新直播平台。
- 修改现有平台的连接、重连、消息解析。
- 排查「平台显示已连接但收不到弹幕」。

## 前置阅读

1. `AGENTS.md` 第 5 节架构不变量。
2. `docs/design/platforms.md` 与 `docs/ARCHITECTURE.md`。
3. `docs/guides/add-platform.md`。

## 步骤

1. 确认能力：只读弹幕 / 礼物 / 进场 / 发送。第一版不实现发送。
2. 在 `contracts/platform.ts` 增加 `PlatformId`，在 `contracts/config.ts` 注册配置 schema。
3. 建 `src/platforms/<id>/`：`index.ts`、`adapter.ts`、`protocol.ts`、`schema.ts`。
4. 实现 `PlatformAdapterFactory` 与 `PlatformAdapter`；`connect` 必须响应 `AbortSignal`。
5. 把原始消息翻译成 `PlatformEvent`；不要在这里解析力度命令。
6. 在 `main/composition.ts` 注册 factory。
7. 实现可选的 `probe(config, context)`，让平台自动出现在网络连通性测试里。
8. 用脱敏 fixture 写协议测试；不要连真实直播间。
9. 更新 `docs/design/platforms.md` 的平台能力表。

## 硬性要求

- 不 import `kernel`、`tools`、`electron`。
- 不把 cookie、token、SESSDATA 写进日志或仓库。
- `disconnect` 幂等，退出后无残留 socket/定时器。
- 重连有退避和抖动；用户手动断开后不自动重连。
- 所有外部输入先 zod 解析。
- 消息 id 缺失时生成稳定 id，不能一律用时间戳导致去重失效。

## 验收

- [ ] `npm run typecheck` 通过。
- [ ] `npm run lint` 通过（边界规则）。
- [ ] fixture 测试覆盖正常、压缩、多包、异常包。
- [ ] 控制台能看到连接状态与消息。
- [ ] 断开后进程无残留句柄。
- [ ] 文档已同步。
