<script setup lang="ts">
import { computed } from 'vue'
import type { DiceFaces } from '@contracts/dice'
import type { DicePhase } from '@contracts/view'
import DiceIdle from './DiceIdle.vue'
import { facesLabel } from '../../shared/format'

const props = defineProps<{
  phase: DicePhase
  remaining: number
  total: number
  value: number | null
  faces: DiceFaces
}>()

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progress = computed(() => {
  if (props.phase !== 'collecting') return 0
  if (props.total <= 0) return 0
  return Math.min(1, Math.max(0, props.remaining / props.total))
})

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))
const seconds = computed(() => Math.max(0, Math.ceil(props.remaining)))
const warning = computed(() => props.phase === 'collecting' && props.remaining <= 5)
</script>

<template>
  <div class="ring" :class="{ warning }">
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <circle class="track" cx="90" cy="90" :r="RADIUS" />
      <circle
        class="bar"
        cx="90"
        cy="90"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90 90 90)"
      />
    </svg>

    <div class="center">
      <template v-if="phase === 'collecting'">
        <span class="number">{{ seconds }}</span>
        <span class="label">剩余秒</span>
      </template>
      <template v-else-if="phase === 'rolling'">
        <span class="rolling">投掷中</span>
        <span class="label">物理模拟</span>
      </template>
      <template v-else-if="phase === 'result'">
        <span class="result">{{ value ?? '—' }}</span>
        <span class="label">{{ facesLabel(faces) }} 点数</span>
      </template>
      <template v-else>
        <DiceIdle />
        <span class="label">等待开始</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  width: 220px;
  height: 220px;
  flex: 0 0 220px;
}

svg {
  width: 100%;
  height: 100%;
}

.track,
.bar {
  fill: none;
  stroke-width: 8;
}

.track {
  stroke: var(--hairline);
}

.bar {
  stroke: var(--accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 200ms linear, stroke 180ms var(--ease-out), opacity 180ms var(--ease-out);
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--ink);
}

.number {
  font-family: var(--font-mono);
  font-size: 40px;
  font-weight: 600;
  line-height: 44px;
  font-variant-numeric: tabular-nums;
}

.result {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 52px;
  font-weight: 700;
  line-height: 56px;
  letter-spacing: -2px;
  text-shadow: var(--glow-accent);
}

.rolling {
  color: var(--info);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
}

.label {
  color: var(--mute);
  font-size: 11px;
  letter-spacing: 0.8px;
}

.warning .bar {
  stroke: var(--warning);
}

.warning .number {
  color: var(--warning);
}
</style>
