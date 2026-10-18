import { spawn } from 'node:child_process'
import electronPath from 'electron'

/**
 * 某些 Electron 宿主会把 ELECTRON_RUN_AS_NODE=1 传给子进程，
 * 导致 electron 以 Node 模式运行、app 为 undefined。启动前清理掉。
 */
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
if (env.NODE_OPTIONS?.includes('dsh-acl-sandbox-patch')) delete env.NODE_OPTIONS

const child = spawn(electronPath, process.argv.slice(2), {
  stdio: 'inherit',
  env
})

child.on('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error('启动 Electron 失败：', error.message)
  process.exit(1)
})
