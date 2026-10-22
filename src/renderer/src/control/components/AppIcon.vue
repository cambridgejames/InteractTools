<script setup lang="ts">
type IconName =
  | 'dashboard'
  | 'dice'
  | 'wheel'
  | 'vote'
  | 'tools'
  | 'platforms'
  | 'settings'
  | 'play'
  | 'stop'
  | 'eye'
  | 'refresh'
  | 'folder'
  | 'close'
  | 'plus'
  | 'history'
  | 'check'
  | 'warning'
  | 'chevron'
  | 'bilibili'
  | 'douyin'
  | 'gift'
  | 'users'
  | 'external'
  | 'search'
  | 'globe'
  | 'keyboard'
  | 'send'

const props = withDefaults(defineProps<{ name: IconName; size?: number; strokeWidth?: number }>(), {
  size: 18,
  strokeWidth: 1.7
})

/** 线框与实心图形的可视边界不同，按光学校正到同一视觉重量。 */
const opticalScale: Partial<Record<IconName, number>> = {
  bilibili: 1.35,
  douyin: 0.8,
  users: 0.95
}

const filledIcons = new Set<IconName>(['douyin'])

const paths: Record<IconName, string> = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  dice: 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10',
  wheel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 9v3l2 1',
  vote: 'M4 20h16M7 20v-6M12 20V8M17 20v-9',
  tools: 'M14 6a3 3 0 0 0-4 4L4 16v4h4l6-6a3 3 0 0 0 4-4l-3 3-2-2z',
  platforms: 'M12 4v16M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M8 4v6M16 14v6',
  play: 'M8 5l11 7-11 7z',
  stop: 'M7 7h10v10H7z',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  folder: 'M3 6h6l2 2h10v10H3z',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  check: 'M4 12l5 5L20 6',
  warning: 'M12 3l9 16H3zM12 9v4M12 16h.01',
  chevron: 'M6 9l6 6 6-6',
  bilibili: 'M5 8h14v9H5zM8 5l2 3M16 5l-2 3M9 12v2M15 12v2',
  douyin: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  gift: 'M4 10h16v10H4zM2 6h20v4H2zM12 6v14M8 6a2 2 0 1 1 4 0M16 6a2 2 0 1 0-4 0',
  users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M16 15c3 0 5 2 5 5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  keyboard: 'M3 7h18v10H3zM6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z'
}
</script>

<template>
  <svg
    :width="props.size * (opticalScale[props.name] ?? 1)"
    :height="props.size * (opticalScale[props.name] ?? 1)"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="props.strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      :d="paths[props.name]"
      :fill="filledIcons.has(props.name) ? 'currentColor' : 'none'"
      :stroke="filledIcons.has(props.name) ? 'none' : 'currentColor'"
    />
  </svg>
</template>
