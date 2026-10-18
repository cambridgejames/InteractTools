export type VoteChoiceParse =
  | { readonly status: 'ignored' }
  | { readonly status: 'matched'; readonly index: number }
  | { readonly status: 'invalid'; readonly reason: string }

/**
 * 解析投票指令。
 *
 * 接受 `!投票 A`、`投票 1`、`vote B`；只认消息开头，避免聊天里
 * 提到「投票」两个字就被计票。数字按 1-based 选项下标处理，文字按选项
 * 标签精确匹配；两者都不命中则返回 invalid。
 */
export function parseVoteCommand(
  text: string,
  aliases: readonly string[],
  options: readonly string[]
): VoteChoiceParse {
  const normalized = normalize(text)
  const names = aliases
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0)
    .sort((left, right) => right.length - left.length)

  if (names.length === 0 || options.length === 0) return { status: 'ignored' }

  const pattern = new RegExp(
    '^[ \t]*[!#]?[ \t]*(?:' +
      names.map(escapeRegExp).join('|') +
      ')[ \t]*(?:[:=][ \t]*)?(.*)$',
    'iu'
  )
  const match = pattern.exec(normalized)
  if (match === null) return { status: 'ignored' }

  const raw = (match[1] ?? '').trim()
  if (raw.length === 0) return { status: 'invalid', reason: '没有填写选项' }

  if (/^\d{1,2}$/.test(raw)) {
    const index = Number.parseInt(raw, 10) - 1
    if (index >= 0 && index < options.length) return { status: 'matched', index }
    return { status: 'invalid', reason: '选项序号超出范围' }
  }

  const index = options.findIndex((option) => option.toLocaleLowerCase() === raw.toLocaleLowerCase())
  if (index >= 0) return { status: 'matched', index }
  return { status: 'invalid', reason: '没有这个选项' }
}

export function tallyVotes(votes: Iterable<number>, optionCount: number): number[] {
  const counts = Array.from({ length: optionCount }, () => 0)
  for (const index of votes) {
    if (Number.isInteger(index) && index >= 0 && index < optionCount) {
      counts[index] = (counts[index] ?? 0) + 1
    }
  }
  return counts
}

/** 返回并列最高票的所有下标；0 票时返回空数组，不伪造赢家。 */
export function pollWinners(counts: readonly number[]): number[] {
  const max = Math.max(0, ...counts)
  if (max === 0) return []
  return counts.flatMap((count, index) => (count === max ? [index] : []))
}

function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ':')
    .replace(/＝/g, '=')
    .replace(/！/g, '!')
    .replace(/＃/g, '#')
    .replace(/\u3000/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
}
