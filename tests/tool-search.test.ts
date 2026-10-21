import { describe, expect, it } from 'vitest'
import type { ToolCatalogItem } from '@contracts/view'
import { highlightText, rankTools, tokenizeQuery } from '../src/renderer/src/control/tool-search'

const tools: readonly ToolCatalogItem[] = [
  {
    toolId: 'dice',
    name: '投骰子',
    description: '观众用弹幕设置力度，倒计时结束后用真实刚体物理掷骰。',
    icon: 'dice',
    commands: ['!力度 80'],
    keywords: ['骰子', '物理', 'd20'],
    enabled: true
  },
  {
    toolId: 'wheel',
    name: '转转盘',
    description: '主播手动触发，适合抽奖、选品和现场决策。',
    icon: 'wheel',
    commands: [],
    keywords: ['转盘', '抽奖'],
    enabled: true
  },
  {
    toolId: 'vote',
    name: '弹幕投票',
    description: '观众用弹幕投票，实时统计票数。',
    icon: 'vote',
    commands: ['投票'],
    keywords: ['选项', '票数'],
    enabled: false
  }
]

describe('tool search', () => {
  it('keeps catalog order for an empty query', () => {
    expect(rankTools(tools, '   ').map((row) => row.tool.toolId)).toEqual(['dice', 'wheel', 'vote'])
  })

  it('matches names and descriptions', () => {
    expect(rankTools(tools, '骰子')[0]?.tool.toolId).toBe('dice')
    expect(rankTools(tools, '抽奖')[0]?.tool.toolId).toBe('wheel')
    expect(rankTools(tools, '票数')[0]?.tool.toolId).toBe('vote')
  })

  it('supports multiple keywords and CJK bigram segmentation', () => {
    expect(rankTools(tools, '骰子 物理').map((row) => row.tool.toolId)).toEqual(['dice'])
    expect(rankTools(tools, '骰子物理').map((row) => row.tool.toolId)).toEqual(['dice'])
  })

  it('keeps the matched term visible in a long description snippet', () => {
    const row = rankTools(tools, '物理')[0]
    expect(row?.snippet).toContain('物理')
  })

  it('matches full pinyin and initials', () => {
    const dice = rankTools(tools, 'touzi')[0]
    expect(dice?.tool.toolId).toBe('dice')
    expect(dice?.pinyinMatch).toBe(true)
    expect(rankTools(tools, 'zhuanpan')[0]?.tool.toolId).toBe('wheel')
    expect(rankTools(tools, 'toupiao')[0]?.tool.toolId).toBe('vote')
    expect(rankTools(tools, 'wuli')[0]?.tool.toolId).toBe('dice')
    expect(rankTools(tools, 'tz')[0]?.tool.toolId).toBe('dice')
  })

  it('returns no rows for an unknown term', () => {
    expect(rankTools(tools, 'zzz')).toEqual([])
  })

  it('tokenizes CJK runs into bigrams', () => {
    expect(tokenizeQuery('骰子物理')).toEqual(expect.arrayContaining(['骰子', '物理', '骰子物理']))
  })

  it('marks matched characters without treating input as HTML', () => {
    const parts = highlightText('投骰子', ['骰子'])
    expect(parts).toEqual([
      { text: '投', match: false },
      { text: '骰子', match: true }
    ])
  })
})
