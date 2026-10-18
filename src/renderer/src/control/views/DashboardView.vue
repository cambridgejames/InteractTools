<script setup lang="ts">
import { computed } from 'vue'
import FeedPanel from '../components/FeedPanel.vue'
import HistoryPanel from '../components/HistoryPanel.vue'
import ToolSwitcher from '../components/ToolSwitcher.vue'
import WheelHistoryPanel from '../components/WheelHistoryPanel.vue'
import { actions, selectActiveTool, state } from '../store'
import { TOOL_PANELS } from '../tool-panels'

defineEmits<{ navigate: [page: 'dashboard'] }>()

const tools = computed(() => state.snapshot?.tools ?? [])
const active = computed(() => selectActiveTool(state.snapshot))
const dice = computed(() => (active.value?.toolId === 'dice' ? active.value : null))
const wheel = computed(() => (active.value?.toolId === 'wheel' ? active.value : null))
const panel = computed(() => (active.value === null ? null : TOOL_PANELS[active.value.toolId] ?? null))
</script>

<template>
  <div class="dashboard">
    <ToolSwitcher
      class="switcher"
      :tools="tools"
      :active-id="state.activeToolId"
      @select="actions.selectTool"
    />

    <div class="main-col">
      <component :is="panel" v-if="panel && active" :view="active" />
      <section v-else class="empty-card">
        <strong>这个工具还没有控制面板</strong>
        <span>在 renderer/src/control/tool-panels.ts 注册组件，框架和 overlay 不用改。</span>
      </section>
    </div>

    <FeedPanel />

    <HistoryPanel v-if="dice" class="history" :history="dice.history" />
    <WheelHistoryPanel v-else-if="wheel" class="history" :history="wheel.history" />
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: var(--s-5);
  align-items: start;
  max-width: var(--content-max);
  margin: 0 auto;
}

.switcher {
  grid-column: 1 / -1;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.history {
  grid-column: 1 / -1;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: 48px;
  border: 1px dashed var(--hairline-strong);
  border-radius: var(--r-card);
  color: var(--mute);
}

.empty-card strong {
  color: var(--body);
  font-size: 14px;
  font-weight: 500;
}

.empty-card span {
  font-size: 12px;
}

@media (max-width: 1180px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr);
  }

  .history {
    grid-column: auto;
  }
}
</style>
