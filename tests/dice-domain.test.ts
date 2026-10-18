import { describe, expect, it } from 'vitest'
import type { PowerVote } from '@contracts/dice'
import { foldVotes, summarizePower } from '@tools/dice/domain/aggregate'
import { parsePowerCommand } from '@tools/dice/domain/command'

const aliases = ['力度', 'power']

describe('parsePowerCommand', () => {
  it.each([
    ['!力度 80', 80],
    ['#力度 80', 80],
    ['力度80', 80],
    ['力度：80', 80],
    ['  力度 = 0  ', 0],
    ['POWER 100', 100],
    ['！力度 ６６', 66]
  ])('parses %s', (text, expected) => {
    const result = parsePowerCommand(text, aliases)
    expect(result).toEqual({ status: 'matched', value: expected })
  })

  it('ignores ordinary chat', () => {
    expect(parsePowerCommand('主播力度好大', aliases)).toEqual({ status: 'ignored' })
    expect(parsePowerCommand('666', aliases)).toEqual({ status: 'ignored' })
  })

  it('rejects missing and out-of-range values', () => {
    expect(parsePowerCommand('!力度', aliases).status).toBe('invalid')
    expect(parsePowerCommand('!力度 101', aliases).status).toBe('invalid')
    expect(parsePowerCommand('!力度 abc', aliases).status).toBe('invalid')
  })
})

describe('aggregate', () => {
  const votes: PowerVote[] = [
    { userKey: 'mock:a', userName: 'A', power: 10, receivedAt: 1 },
    { userKey: 'mock:b', userName: 'B', power: 90, receivedAt: 2 },
    { userKey: 'mock:a', userName: 'A', power: 30, receivedAt: 3 },
    { userKey: 'mock:c', userName: 'C', power: 50, receivedAt: 4 },
    { userKey: 'mock:d', userName: 'D', power: 100, receivedAt: 5 }
  ]

  it('keeps the last vote per user', () => {
    const folded = foldVotes(votes)
    expect(folded).toHaveLength(4)
    expect(folded.find((vote) => vote.userKey === 'mock:a')?.power).toBe(30)
  })

  it('computes mean, median and trimmed mean', () => {
    const summary = summarizePower(votes, 'median')
    expect(summary).not.toBeNull()
    expect(summary?.count).toBe(4)
    expect(summary?.min).toBe(30)
    expect(summary?.max).toBe(100)
    expect(summary?.mean).toBe(67.5)
    expect(summary?.median).toBe(70)
    expect(summary?.value).toBe(70)
  })

  it('returns null for empty input', () => {
    expect(summarizePower([], 'median')).toBeNull()
  })
})
