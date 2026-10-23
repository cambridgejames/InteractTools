import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildApplyScript,
  findZipAsset,
  isZipInstall,
  quotePowerShell,
  verifyDigest,
  type ReleaseAsset
} from '../src/main/services/zip-update'

const asset = (name: string): ReleaseAsset => ({
  name,
  browser_download_url: 'https://example.com/' + name
})

describe('zip update helpers', () => {
  it('picks the zip for the current architecture and ignores other assets', () => {
    const assets = [
      asset('Interact-Studio-1.0.0-x64.exe'),
      asset('Interact-Studio-1.0.0-x64.zip.blockmap'),
      asset('Interact-Studio-1.0.0-arm64.zip'),
      asset('Interact-Studio-1.0.0-x64.zip')
    ]
    expect(findZipAsset(assets, 'x64')?.name).toBe('Interact-Studio-1.0.0-x64.zip')
    expect(findZipAsset(assets, 'arm64')?.name).toBe('Interact-Studio-1.0.0-arm64.zip')
  })

  it('returns null when the release has no zip', () => {
    expect(findZipAsset([asset('app-setup.exe')], 'x64')).toBeNull()
  })

  it('verifies sha256 digests', () => {
    const data = Buffer.from('interact')
    expect(verifyDigest(data, undefined)).toBe(true)
    expect(verifyDigest(data, 'sha256:bad')).toBe(false)
    expect(verifyDigest(data, 'sha256:' + '9c4e2c6d2c0a6c8f5c0e3b4d5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6')).toBe(false)
  })

  it('escapes paths in the apply script', () => {
    expect(quotePowerShell("C:\\It's here")).toBe("'C:\\It''s here'")
    const script = buildApplyScript({
      processId: 123,
      zipPath: "C:\\It's here\\app.zip",
      installDir: 'C:\\App',
      exePath: 'C:\\App\\互动工坊.exe'
    })
    expect(script).toContain('Get-Process -Id 123')
    expect(script).toContain("C:\\It''s here")
    expect(script).toContain('Expand-Archive')
  })

  it.skipIf(process.platform !== 'win32')('detects an extracted zip directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'interact-zip-'))
    mkdirSync(join(root, 'resources'))
    writeFileSync(join(root, 'resources', 'app.asar'), '')
    const exe = join(root, '互动工坊.exe')
    expect(isZipInstall(exe, ['resources', '互动工坊.exe'])).toBe(true)
    writeFileSync(join(root, 'Uninstall 互动工坊.exe'), '')
    expect(isZipInstall(exe, ['resources', '互动工坊.exe', 'Uninstall 互动工坊.exe'])).toBe(false)
  })
})
