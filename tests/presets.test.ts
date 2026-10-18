import { describe, expect, it } from 'vitest'
import { DEFAULT_VOTE_CONFIG, voteConfigSchema } from '@contracts/vote'
import { DEFAULT_WHEEL_CONFIG, wheelConfigSchema } from '@contracts/wheel'

describe('tool presets', () => {
  it('accepts named wheel and vote presets', () => {
    const wheel = wheelConfigSchema.safeParse({
      ...DEFAULT_WHEEL_CONFIG,
      presets: [
        {
          id: 'truth',
          name: '真心话',
          segments: ['上次最尴尬的事', '最想合作的主播'],
          spinDurationSeconds: 5
        }
      ]
    })
    expect(wheel.success).toBe(true)

    const vote = voteConfigSchema.safeParse({
      ...DEFAULT_VOTE_CONFIG,
      presets: [
        {
          id: 'dare',
          name: '大冒险',
          question: '大冒险',
          options: ['唱歌', '深蹲'],
          countdownSeconds: 30
        }
      ]
    })
    expect(vote.success).toBe(true)
  })

  it('rejects invalid preset shapes', () => {
    const wheel = wheelConfigSchema.safeParse({
      ...DEFAULT_WHEEL_CONFIG,
      presets: [{ id: 'bad', name: '', segments: ['only'], spinDurationSeconds: 60 }]
    })
    expect(wheel.success).toBe(false)
  })
})
