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

  it('defaults network proxy to direct connection', () => {
    const { network: _network, ...legacy } = DEFAULT_APP_CONFIG
    const parsed = appConfigSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.network.proxyMode).toBe('none')
  })

  it('defaults mock users and rejects an out-of-range count', () => {
    const parsed = appConfigSchema.safeParse(DEFAULT_APP_CONFIG)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.platforms.mock.userCount).toBe(8)

    const invalid = appConfigSchema.safeParse({
      ...DEFAULT_APP_CONFIG,
      platforms: {
        ...DEFAULT_APP_CONFIG.platforms,
        mock: { ...DEFAULT_APP_CONFIG.platforms.mock, userCount: 0 }
      }
    })
    expect(invalid.success).toBe(false)
  })

  it('defaults all game tools to enabled', () => {
    const { network: _network, enabledTools: _enabledTools, ...legacy } = DEFAULT_APP_CONFIG
    const parsed = appConfigSchema.safeParse(legacy)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.enabledTools).toEqual({ dice: true, wheel: true, vote: true })
  })

  it('rejects an unknown proxy mode', () => {
    const parsed = appConfigSchema.safeParse({
      ...DEFAULT_APP_CONFIG,
      network: { proxyMode: 'socks', proxyUrl: 'socks5://127.0.0.1:1080' }
    })
    expect(parsed.success).toBe(false)
  })
})
