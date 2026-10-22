import { existsSync } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AppLogger } from '../src/main/services/logger'

describe('AppLogger', () => {
  it('writes a rotated file and collects a zip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'interact-logs-'))
    const logger = new AppLogger(dir, 'debug')
    try {
      logger.info('test', 'hello', 'detail')
      await new Promise((resolve) => setTimeout(resolve, 200))
      const zip = await logger.collect()
      expect(existsSync(zip)).toBe(true)
      expect((await stat(zip)).size).toBeGreaterThan(0)
    } finally {
      logger.close()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
