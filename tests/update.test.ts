import { describe, expect, it } from 'vitest'
import { compareVersions, normalizeVersion } from '@contracts/update'

describe('update version compare', () => {
  it('normalizes v-prefix and prerelease suffix', () => {
    expect(normalizeVersion('v1.2.3-beta.1')).toBe('1.2.3')
    expect(normalizeVersion(' 0.1.0 ')).toBe('0.1.0')
  })

  it('compares each numeric segment', () => {
    expect(compareVersions('0.2.0', '0.1.9')).toBeGreaterThan(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
  })
})
