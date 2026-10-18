<script setup lang="ts">
import { computed } from 'vue'
import type { PlatformPhase } from '@contracts/platform'
import { platformPhaseLabel } from '../store'

const props = defineProps<{ phase: PlatformPhase; label?: string }>()

const text = computed(() => props.label ?? platformPhaseLabel(props.phase))
</script>

<template>
  <span class="pill" :class="'phase-' + phase">
    <i class="dot" />
    <span>{{ text }}</span>
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: var(--r-chip);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.phase-connected {
  color: var(--success);
}

.phase-connecting {
  color: var(--info);
}

.phase-connecting .dot {
  animation: pulse 1.2s ease-in-out infinite;
}

.phase-reconnecting {
  color: var(--warning);
}

.phase-error {
  color: var(--danger);
}

.phase-disconnected {
  color: var(--faint);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .phase-connecting .dot {
    animation: none;
  }
}
</style>
