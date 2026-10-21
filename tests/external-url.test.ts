import { describe, expect, it } from 'vitest'
import { externalUrlSchema } from '../src/main/ipc/external-url'

describe('external URL allowlist', () => {
  it('allows the project GitHub and official live rooms', () => {
    expect(externalUrlSchema.safeParse('https://github.com/cambridgejames/InteractTools').success).toBe(true)
    expect(externalUrlSchema.safeParse('https://live.bilibili.com/6').success).toBe(true)
    expect(externalUrlSchema.safeParse('https://live.douyin.com/275741202812').success).toBe(true)
  })

  it('rejects other origins, HTTP and disguised userinfo URLs', () => {
    expect(externalUrlSchema.safeParse('https://example.com').success).toBe(false)
    expect(externalUrlSchema.safeParse('http://live.bilibili.com/6').success).toBe(false)
    expect(externalUrlSchema.safeParse('https://github.com/other/repo').success).toBe(false)
    expect(externalUrlSchema.safeParse('https://evil.com@live.douyin.com/1').success).toBe(false)
    expect(externalUrlSchema.safeParse('not-a-url').success).toBe(false)
  })
})
