import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_CONFIG, uiConfigSchema } from '@contracts/config'
import { DEFAULT_VOTE_CONFIG, voteConfigSchema } from '@contracts/vote'
import { DEFAULT_WHEEL_CONFIG, wheelConfigSchema } from '@contracts/wheel'

describe('默认预设', () => {
  it('转盘默认载入真心话，并附带真心话/大冒险预设', () => {
    const config = wheelConfigSchema.parse(DEFAULT_WHEEL_CONFIG)
    expect(config.presets.map((preset) => preset.name)).toEqual(['真心话', '大冒险'])
    expect(config.segments).toEqual(config.presets[0]?.segments)
    expect(config.presets.every((preset) => preset.segments.length >= 6)).toBe(true)
  })

  it('投票默认提供今晚玩什么/惩罚方式两个预设且选项不重复', () => {
    const config = voteConfigSchema.parse(DEFAULT_VOTE_CONFIG)
    expect(config.presets.map((preset) => preset.name)).toEqual(['今晚玩什么', '惩罚方式'])
    for (const options of [config.options, ...config.presets.map((preset) => preset.options)]) {
      expect(new Set(options).size).toBe(options.length)
      expect(options.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('界面默认显示顶部平台，关闭真实平台标签但保留模拟标签', () => {
    const ui = uiConfigSchema.parse({})
    expect(ui).toEqual({
      theme: 'dark',
      showActivePlatforms: true,
      showFeedPlatforms: false,
      showMockLabel: true,
      onboardingDone: false
    })
    expect(DEFAULT_APP_CONFIG.ui).toEqual(ui)
  })
})
