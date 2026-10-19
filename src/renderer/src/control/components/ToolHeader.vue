<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

type ToolIcon = 'dice' | 'wheel' | 'vote'

const props = withDefaults(
  defineProps<{
    icon: ToolIcon
    title: string
    description: string
    phaseText: string
    tone?: 'idle' | 'active' | 'done'
  }>(),
  { tone: 'idle' }
)

const phaseClass = computed(() => 'phase-' + props.tone)
</script>

<template>
  <header class="card-head">
    <div class="title">
      <span class="glyph"><AppIcon :name="icon" :size="20" /></span>
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
    </div>
    <span class="phase" :class="phaseClass">{{ phaseText }}</span>
  </header>
</template>

<style scoped>
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-5);
  border-bottom: 1px solid var(--hairline);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.glyph {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--accent);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.title p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.phase {
  padding: 4px 10px;
  border-radius: var(--r-chip);
  background: var(--surface-active);
  color: var(--mute);
  font-size: 11px;
  white-space: nowrap;
}

.phase-active {
  color: var(--accent);
  background: var(--accent-soft);
}

.phase-done {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}
</style>
