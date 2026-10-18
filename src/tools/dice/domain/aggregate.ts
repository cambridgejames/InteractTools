import type { Aggregation, PowerSummary, PowerVote } from '@contracts/dice'

/**
 * 同一观众只保留最后一条力度。
 *
 * Map 的插入顺序保留第一次出现的位置，因此参与者列表不会因为改票而跳动。
 */
export function foldVotes(votes: readonly PowerVote[]): readonly PowerVote[] {
  const byUser = new Map<string, PowerVote>()
  for (const vote of votes) byUser.set(vote.userKey, vote)
  return [...byUser.values()]
}

export function summarizePower(
  votes: readonly PowerVote[],
  method: Aggregation
): PowerSummary | null {
  const folded = foldVotes(votes)
  if (folded.length === 0) return null

  const values = folded.map((vote) => vote.power).sort((a, b) => a - b)
  const mean = average(values)
  const median = medianOf(values)
  const trimmedMean = trimmedMeanOf(values)

  return {
    count: values.length,
    min: at(values, 0),
    max: at(values, values.length - 1),
    mean,
    median,
    trimmedMean,
    value: pick(method, { mean, median, trimmedMean }),
    method,
    fallback: false
  }
}

/** 无人参与时的兜底摘要；保留完整字段，避免 UI 到处判空。 */
export function fallbackSummary(power: number, method: Aggregation): PowerSummary {
  return {
    count: 0,
    min: power,
    max: power,
    mean: power,
    median: power,
    trimmedMean: power,
    value: power,
    method,
    fallback: true
  }
}

function pick(
  method: Aggregation,
  values: { readonly mean: number; readonly median: number; readonly trimmedMean: number }
): number {
  switch (method) {
    case 'mean':
      return values.mean
    case 'median':
      return values.median
    case 'trimmedMean':
      return values.trimmedMean
  }
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function medianOf(sorted: readonly number[]): number {
  const size = sorted.length
  if (size === 0) return 0
  const middle = Math.floor(size / 2)
  if (size % 2 === 1) return at(sorted, middle)
  return (at(sorted, middle - 1) + at(sorted, middle)) / 2
}

function trimmedMeanOf(sorted: readonly number[]): number {
  const size = sorted.length
  if (size < 3) return average(sorted)

  const trim = Math.floor(size * 0.1)
  const kept = sorted.slice(trim, size - trim)
  return average(kept.length === 0 ? sorted : kept)
}

function at(values: readonly number[], index: number): number {
  const value = values[index]
  if (value === undefined) throw new Error('聚合索引越界')
  return value
}
