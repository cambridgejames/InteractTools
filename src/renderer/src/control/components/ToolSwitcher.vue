<script setup lang="ts">
import type { ToolView } from '@contracts/view'
import AppIcon from './AppIcon.vue'

defineProps<{ tools: readonly ToolView[]; activeId: string }>()
const emit = defineEmits<{ select: [toolId: string] }>()

function iconOf(icon: string): 'dice' | 'wheel' | 'vote' | 'tools' {
  if (icon === 'dice') return 'dice'
  if (icon === 'wheel') return 'wheel'
  if (icon === 'vote') return 'vote'
  return 'tools'
}

function modeOf(tool: ToolView): string {
  if (tool.toolId === 'dice') return '弹幕互动'
  if (tool.toolId === 'vote') return '弹幕互动'
  if (tool.toolId === 'wheel') return '主播手动'
  return '工具'
}
</script>

<template>
  <div class="switcher" data-tour="tool-switcher" role="tablist" aria-label="互动工具">
    <button
      v-for="tool in tools"
      :key="tool.toolId"
      class="tool-tab"
      :class="{ active: tool.toolId === activeId }"
      role="tab"
      :aria-selected="tool.toolId === activeId"
      @click="emit('select', tool.toolId)"
    >
      <span class="tab-icon"><AppIcon :name="iconOf(tool.icon)" :size="17" /></span>
      <span class="tab-text">
        <strong>{{ tool.name }}</strong>
        <em>{{ modeOf(tool) }}</em>
      </span>
    </button>
  </div>
</template>

<style scoped>
.switcher {
  display: flex;
  gap: var(--s-2);
  padding: 6px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--canvas-elevated);
}

.tool-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 148px;
  height: 44px;
  padding: 0 var(--s-3);
  border: 1px solid transparent;
  border-radius: var(--r-control);
  background: transparent;
  color: var(--mute);
  text-align: left;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.tool-tab:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.tool-tab.active {
  border-color: color-mix(in srgb, var(--accent) 32%, var(--hairline));
  background: var(--surface-active);
  color: var(--ink);
}

.tool-tab.active::before {
  content: '';
  position: absolute;
  left: -9px;
  width: 2px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent);
}

.tab-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  background: var(--surface-active);
  color: var(--accent);
}

.tab-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.tab-text strong {
  font-size: 13px;
  font-weight: 600;
}

.tab-text em {
  color: var(--faint);
  font-size: 12px;
  font-style: normal;
  letter-spacing: 0.4px;
}

.tool-tab.active .tab-text em {
  color: var(--mute);
}

@media (max-width: 980px) {
  .switcher {
    flex-wrap: wrap;
  }

  .tool-tab {
    min-width: 132px;
  }
}
</style>
