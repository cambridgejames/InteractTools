import { createHash } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** GitHub Release 里的单个资产。 */
export interface ReleaseAsset {
  readonly name: string
  readonly browser_download_url: string
  readonly size?: number | undefined
  readonly digest?: string | null | undefined
}

/**
 * 判断当前是否是从 zip 解压运行的 Windows 版本。
 *
 * NSIS 安装目录一定带 Uninstall*.exe；zip 目录没有，且一定有
 * resources/app.asar。便携单文件版由 PORTABLE_EXECUTABLE_FILE 标记，
 * 不在这里处理，避免误把临时解压目录当成安装目录。
 */
export function isZipInstall(exePath: string, entries: readonly string[]): boolean {
  if (process.platform !== 'win32') return false
  if (process.env.PORTABLE_EXECUTABLE_FILE !== undefined) return false
  const dir = dirname(exePath)
  if (!entries.includes('resources') || !existsSync(join(dir, 'resources', 'app.asar'))) return false
  return !entries.some((name) => /^Uninstall.*\.exe$/i.test(name))
}

/** 从资产列表里挑当前架构的 zip；没有明确架构时也可接受。 */
export function findZipAsset(assets: readonly ReleaseAsset[], arch: string): ReleaseAsset | null {
  const candidates = assets.filter((asset) => {
    const name = asset.name.toLowerCase()
    if (!name.endsWith('.zip') || name.includes('blockmap')) return false
    if (name.includes('mac') || name.includes('darwin')) return false
    return name.includes(arch.toLowerCase()) || !/x64|arm64|ia32/.test(name)
  })
  return candidates.find((asset) => asset.name.toLowerCase().includes('win')) ?? candidates[0] ?? null
}

/** 校验 GitHub asset digest；没有 digest 时返回 true。 */
export function verifyDigest(buffer: Buffer, digest: string | null | undefined): boolean {
  if (digest === undefined || digest === null || !digest.startsWith('sha256:')) return true
  return createHash('sha256').update(buffer).digest('hex') === digest.slice(7)
}

/** PowerShell 单引号字符串转义。 */
export function quotePowerShell(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'"
}

/**
 * 生成退出后替换 zip 并重启的脚本。
 *
 * 不能由进程自己覆盖正在运行的 exe/asar，所以先退出，再由独立 PowerShell
 * 等进程消失后解压。脚本只接收绝对路径，避免路径拼接执行任意命令。
 */
export function buildApplyScript(input: {
  readonly processId: number
  readonly zipPath: string
  readonly installDir: string
  readonly exePath: string
}): string {
  const errorLog = join(input.installDir, 'update-error.log')
  return [
    "$ErrorActionPreference = 'Stop'",
    'try {',
    '  while (Get-Process -Id ' + String(input.processId) + " -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 }",
    '  Start-Sleep -Milliseconds 400',
    '  Expand-Archive -LiteralPath ' + quotePowerShell(input.zipPath) + ' -DestinationPath ' + quotePowerShell(input.installDir) + ' -Force',
    '  Remove-Item -LiteralPath ' + quotePowerShell(input.zipPath) + ' -Force -ErrorAction SilentlyContinue',
    '  Start-Process -FilePath ' + quotePowerShell(input.exePath),
    '} catch {',
    '  $_ | Out-File -FilePath ' + quotePowerShell(errorLog) + " -Encoding utf8",
    '}',
    'Remove-Item -LiteralPath ' + quotePowerShell(join(dirname(input.zipPath), 'apply-update.ps1')) + ' -Force -ErrorAction SilentlyContinue'
  ].join('\r\n')
}

/** 读取目录项；失败时返回空数组，交给调用方跳过 zip 更新。 */
export function readDirectoryNames(path: string): string[] {
  try {
    return readdirSync(path)
  } catch {
    return []
  }
}
