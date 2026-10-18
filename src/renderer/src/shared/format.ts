import type { Aggregation, DiceFaces, PowerSummary } from '@contracts/dice'
import type { DicePhase } from '@contracts/view'

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatPower(power: number): string {
  return Number.isInteger(power) ? String(power) : power.toFixed(1)
}

export function methodLabel(method: Aggregation): string {
  switch (method) {
    case 'mean':
      return '平均值'
    case 'median':
      return '中位数'
    case 'trimmedMean':
      return '截尾均值'
  }
}

export function summaryLabel(summary: PowerSummary): string {
  if (summary.fallback) return '无人参与 · 兜底'
  return summary.count + ' 人 · ' + methodLabel(summary.method)
}

export function phaseLabel(phase: DicePhase): string {
  switch (phase) {
    case 'idle':
      return '待开始'
    case 'collecting':
      return '收集中'
    case 'rolling':
      return '投掷中'
    case 'result':
      return '已停稳'
  }
}

export function facesLabel(faces: DiceFaces): string {
  return 'D' + faces
}

export function initialOf(name: string): string {
  return name.trim().slice(0, 1) || '?'
}

export function formatClockDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? minutes + ':' + String(rest).padStart(2, '0') : String(rest)
}
