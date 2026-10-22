<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{ id: string; size?: number; active?: boolean }>(),
  { size: 32, active: false }
)

const icon = computed<'bilibili' | 'douyin' | 'users' | 'github' | 'globe'>(() => {
  if (props.id === 'bilibili') return 'bilibili'
  if (props.id === 'douyin') return 'douyin'
  if (props.id === 'mock') return 'users'
  if (props.id === 'github') return 'github'
  return 'globe'
})
</script>

<template>
  <span
    class="platform-glyph"
    :class="{ active }"
    :style="{ width: size + 'px', height: size + 'px', flexBasis: size + 'px' }"
  >
    <AppIcon :name="icon" :size="Math.round(size * 0.5)" />
  </span>
</template>

<style scoped>
.platform-glyph {
  display: grid;
  place-items: center;
  flex: none;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--mute);
}

.platform-glyph.active {
  color: var(--accent);
}
</style>
