import { describe, expect, it } from 'vitest'
import { appConfigSchema, DEFAULT_APP_CONFIG } from '@contracts/config'

describe('app layout config', () => {
  it('parses window display and feed mode', () => {
    const parsed = appConfigSchema.safeParse({
      ...DEFAULT_APP_CONFIG,
      window: { display: '12345' },
      feed: { mode: 'hidden' }
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown feed mode', () => {
    const parsed = appConfigSchema.safeParse({
      ...DEFAULT_APP_CONFIG,
      feed: { mode: 'off' }
    })
    expect(parsed.success).toBe(false)
  })
})
