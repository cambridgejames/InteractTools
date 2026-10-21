<script setup lang="ts">
import { computed } from 'vue'
import HistoryPanel from '../components/HistoryPanel.vue'
import ToolSwitcher from '../components/ToolSwitcher.vue'
import VoteHistoryPanel from '../components/VoteHistoryPanel.vue'
import WheelHistoryPanel from '../components/WheelHistoryPanel.vue'
import { actions, selectActiveTool, state } from '../store'
import { TOOL_PANELS } from '../tool-panels'

defineEmits<{ navigate: [page: 'dashboard'] }>()

const tools = computed(() => state.snapshot?.tools ?? [])
const active = computed(() => selectActiveTool(state.snapshot))
const dice = computed(() => (active.value?.toolId === 'dice' ? active.value : null))
const wheel = computed(() => (active.value?.toolId === 'wheel' ? active.value : null))
const vote = computed(() => (active.value?.toolId === 'vote' ? active.value : null))
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
        <strong>{{ tools.length === 0 ? '所有互动工具都已关闭' : '这个工具还没有控制面板' }}</strong>
        <span>
          {{
            tools.length === 0
              ? '到「互动工具」页重新打开；弹幕和平台连接不受影响。'
              : '在 renderer/src/control/tool-panels.ts 注册组件，框架和结果窗不用改。'
          }}
        </span>
      </section>
    </div>

    <HistoryPanel v-if="dice" class="history" :history="dice.history" />
    <WheelHistoryPanel v-else-if="wheel" class="history" :history="wheel.history" />
    <VoteHistoryPanel v-else-if="vote" class="history" :history="vote.history" />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
}

.switcher {
  width: 100%;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.history {
  width: 100%;
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

</style>
