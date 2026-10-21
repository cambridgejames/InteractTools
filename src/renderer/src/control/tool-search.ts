import type { ToolCatalogItem } from '@contracts/view'

export interface HighlightPart {
  readonly text: string
  readonly match: boolean
}

export interface RankedTool {
  readonly tool: ToolCatalogItem
  readonly snippet: string
}

export function modeOfTool(toolId: string): string {
  if (toolId === 'dice' || toolId === 'vote') return '弹幕互动'
  if (toolId === 'wheel') return '主播手动'
  return '工具'
}

/**
 * 词条 + 中文二元组：既支持「骰子 物理」这种多关键词，也能让
 * 「骰子物理」这种连续中文命中「骰子 / 物理」两个词条。
 */
export function tokenizeQuery(raw: string): readonly string[] {
  const normalized = raw.trim().toLowerCase()
  if (normalized.length === 0) return []

  const tokens = new Set<string>()
  for (const part of normalized.split(/[\s,，、/|]+/)) {
    if (part.length === 0) continue
    tokens.add(part)
    const compact = part.replace(/[!<>*]/g, '')
    if (compact.length > 0) tokens.add(compact)

    const chars = Array.from(part)
    if (chars.length > 2 && chars.every((char) => /[\u4e00-\u9fff]/.test(char))) {
      for (let index = 0; index < chars.length - 1; index += 1) {
        tokens.add(chars.slice(index, index + 2).join(''))
      }
    }
  }

  return [...tokens].sort((left, right) => right.length - left.length)
}

export function rankTools(tools: readonly ToolCatalogItem[], rawQuery: string): readonly RankedTool[] {
  const searchTokens = tokenizeQuery(rawQuery)
  const normalizedQuery = rawQuery.trim().toLowerCase()
  if (searchTokens.length === 0) {
    return tools.map((tool) => ({ tool, snippet: modeOfTool(tool.toolId) }))
  }

  const rows: Array<RankedTool & { score: number; index: number }> = []
  tools.forEach((tool, index) => {
    const score = scoreOf(tool, searchTokens, normalizedQuery)
    if (score === 0) return
    rows.push({ tool, snippet: snippetOf(tool, searchTokens), score, index })
  })

  return rows
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => ({ tool: item.tool, snippet: item.snippet }))
}

export function highlightText(text: string, tokens: readonly string[]): readonly HighlightPart[] {
  if (tokens.length === 0) return [{ text, match: false }]

  const lowered = text.toLowerCase()
  const marks = new Array<boolean>(text.length).fill(false)
  for (const token of tokens) {
    let from = 0
    while (from <= lowered.length - token.length) {
      const index = lowered.indexOf(token, from)
      if (index < 0) break
      for (let cursor = index; cursor < index + token.length; cursor += 1) marks[cursor] = true
      from = index + Math.max(1, token.length)
    }
  }

  const parts: HighlightPart[] = []
  let start = 0
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length || marks[index] !== marks[start]) {
      if (index > start) parts.push({ text: text.slice(start, index), match: marks[start] === true })
      start = index
    }
  }
  return parts
}

function snippetOf(tool: ToolCatalogItem, tokens: readonly string[]): string {
  const candidates = [tool.description, ...tool.keywords, ...tool.commands]
  const hit = candidates.find((value) => tokens.some((token) => value.toLowerCase().includes(token)))
  if (hit === undefined) return modeOfTool(tool.toolId)
  if (hit.length <= 42) return hit

  const lowered = hit.toLowerCase()
  const index = tokens.reduce((best, token) => {
    const found = lowered.indexOf(token)
    return found >= 0 && (best < 0 || found < best) ? found : best
  }, -1)
  if (index <= 20) return hit.slice(0, 42) + '…'
  const start = Math.max(0, index - 12)
  return '…' + hit.slice(start, start + 42)
}

function scoreOf(
  tool: ToolCatalogItem,
  searchTokens: readonly string[],
  normalizedQuery: string
): number {
  const fields: Array<{ value: string; weight: number }> = [
    { value: tool.name, weight: 8 },
    { value: modeOfTool(tool.toolId), weight: 2 },
    { value: tool.description, weight: 3 },
    ...tool.keywords.map((value) => ({ value, weight: 6 })),
    ...tool.commands.map((value) => ({ value, weight: 4 }))
  ]

  let matchedTokens = 0
  let score = 0
  for (const token of searchTokens) {
    let best = 0
    for (const field of fields) {
      const lowered = field.value.toLowerCase()
      const index = lowered.indexOf(token)
      if (index >= 0) {
        best = Math.max(best, field.weight * 10 + (index === 0 ? 4 : 0) + Math.min(4, token.length))
      } else if (isSubsequence(token, lowered)) {
        best = Math.max(best, field.weight * 2)
      }
    }
    if (best > 0) {
      matchedTokens += 1
      score += best
    }
  }

  if (matchedTokens === 0) return 0
  if (tool.name.toLowerCase().includes(normalizedQuery)) score += 60
  else if (fields.some((field) => field.value.toLowerCase().includes(normalizedQuery))) score += 20
  return score
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (needle.length <= 1) return haystack.includes(needle)
  let cursor = 0
  for (const char of haystack) {
    if (char === needle[cursor]) cursor += 1
    if (cursor === needle.length) return true
  }
  return false
}
