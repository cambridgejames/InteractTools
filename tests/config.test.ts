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

  it('defaults network proxy to the system proxy', () => {
    const { network: _network, ...legacy } = DEFAULT_APP_CONFIG
    const parsed = appConfigSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.network.proxyMode).toBe('system')
  })

  it('rejects an unknown proxy mode', () => {
    const parsed = appConfigSchema.safeParse({
      ...DEFAULT_APP_CONFIG,
      network: { proxyMode: 'socks', proxyUrl: 'socks5://127.0.0.1:1080' }
    })
    expect(parsed.success).toBe(false)
  })
})
