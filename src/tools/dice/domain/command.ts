export type PowerCommandParse =
  | { readonly status: 'ignored' }
  | { readonly status: 'matched'; readonly value: number }
  | { readonly status: 'invalid'; readonly reason: string }

/**
 * 解析力度指令。
 *
 * 接受 `!力度 80`、`#力度 80`、`力度80`、`力度：80`；
 * 只认消息开头的命令，避免聊天里提到「力度」两个字就被当成投票。
 */
export function parsePowerCommand(
  text: string,
  aliases: readonly string[]
): PowerCommandParse {
  const normalized = normalize(text)
  const names = aliases
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0)
    .sort((a, b) => b.length - a.length)

  if (names.length === 0) return { status: 'ignored' }

  const pattern = new RegExp(
    '^\\s*[!#]?\\s*(?:' + names.map(escapeRegExp).join('|') + ')\\s*(?:[:=]\\s*)?(.*)$',
    'iu'
  )
  const match = pattern.exec(normalized)
  if (match === null) return { status: 'ignored' }

  const raw = (match[1] ?? '').trim()
  if (raw.length === 0) return { status: 'invalid', reason: '没有填写力度' }
  if (!/^[0-9]{1,3}$/.test(raw)) return { status: 'invalid', reason: '力度必须是 0–100 的整数' }

  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    return { status: 'invalid', reason: '力度必须在 0–100 之间' }
  }

  return { status: 'matched', value }
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
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
