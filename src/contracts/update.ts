export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

export interface UpdateState {
  readonly phase: UpdatePhase
  readonly currentVersion: string
  readonly latestVersion?: string
  readonly releaseUrl?: string
  readonly notes?: string
  readonly progress?: number
  readonly message?: string
}

/** 去掉前缀 v 与预发布后缀，只比较 x.y.z。 */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, '').split('-')[0] ?? version
}

export function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] => normalizeVersion(value).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}
