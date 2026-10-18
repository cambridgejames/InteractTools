# 测试策略

## 分层

| 层 | 工具 | 重点 |
| --- | --- | --- |
| domain | Vitest | 命令解析、聚合、状态迁移、边界值 |
| physics | Vitest | 固定 seed 的结果、帧数、停稳判定、d4 读底面 |
| protocol | Vitest + fixture | 分包、压缩、心跳、异常帧 |
| kernel | Vitest + fakes | 超时、取消、重复开始、工具路由 |
| renderer | Vitest + Vue Test Utils | 关键交互与空状态 |
| app | Electron `--smoke` | 启动、白屏、overlay 截图、console error |

## 命令

```bash
npm run test
npm run test:watch
npm run typecheck
npm run lint
npm run build
npm run smoke
```

## 物理确定性

`simulate({ faces, power, seed })` 必须纯函数。测试断言：

- 相同入参 → 相同点数、相同帧数、相同停稳标记。
- 点数在 `1..faces` 内（d10 为 `0..9`）。
- 帧位姿都是有限数，四元数模长接近 1。
- 最大模拟时长内必定结束，不允许死循环。

分布测试单独放 `scripts/dice-distribution.ts`，跑 200 次观察频率，不放进常规 CI，避免拖慢。

## 协议 fixture

真实抓包必须脱敏：去掉 uid、昵称、token、cookie。fixture 只保留解析所需字段与二进制结构。

WBI 签名有固定向量测试：`nav` 的 img/sub key + 固定 `wts` → 真实 `w_rid`，防止混入表或参数排序被改坏。

## B站真连（手动）

真连测试默认跳过，不拖慢 CI。需要网络：

```powershell
$env:LIVE_BILIBILI='1'
$env:LIVE_ROOM='21144080'   # 可选，默认就是这个高人气房间
npx vitest run tests/bilibili-live.test.ts --reporter=verbose
```

它会完整走 `room_init → nav WBI 签名 → getDanmuInfo → WebSocket 认证`，并打印 8 秒内收到的弹幕数量。

## 冒烟

`npm run smoke` 启动 Electron，加载控制台，触发一次本地模拟投骰：

- 截图保存到 `artifacts/smoke/`。
- 人工检查控制台不是白屏、overlay 能看到骰子与结果数字。
- 当前冒烟不自动断言 console error；交付前仍要查看终端与截图。

## CI 顺序

`npm ci` → `typecheck` → `lint` → `test` → `build`。smoke 在 Windows runner 上单独跑，允许手动触发。
