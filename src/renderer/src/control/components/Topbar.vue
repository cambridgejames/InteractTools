<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusPill from './StatusPill.vue'
import { actions, connectedCount, platformPhaseLabel, state } from '../store'

defineProps<{ title: string; subtitle: string }>()

const connected = computed(() => connectedCount(state.snapshot))
const mock = computed(() => state.snapshot?.platforms.find((item) => item.descriptor.id === 'mock'))
const bilibili = computed(() => state.snapshot?.platforms.find((item) => item.descriptor.id === 'bilibili'))
</script>

<template>
  <header class="topbar">
    <div class="heading">
      <div class="title-row">
        <h1>{{ title }}</h1>
        <span v-if="connected > 0" class="live">
          <i class="live-dot" />
          LIVE
        </span>
      </div>
      <p>{{ subtitle }}</p>
    </div>

    <div class="actions">
      <div class="pills">
        <StatusPill
          v-if="mock"
          :phase="mock.status.phase"
          :label="'模拟 · ' + platformPhaseLabel(mock.status.phase)"
        />
        <StatusPill
          v-if="bilibili"
          :phase="bilibili.status.phase"
          :label="'B站 · ' + platformPhaseLabel(bilibili.status.phase)"
        />
      </div>
      <button class="preview" @click="actions.previewOverlay()">
        <AppIcon name="eye" :size="16" />
        预览弹窗
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-5);
  min-height: var(--topbar-height);
  padding: 0 28px;
  border-bottom: 1px solid var(--hairline);
  background: var(--canvas-elevated);
}

.heading {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

h1 {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--s-4);
}

.pills {
  display: flex;
  gap: var(--s-2);
}

.preview {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  height: 32px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--body);
  font-size: 12px;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.preview:hover {
  background: var(--surface-hover);
  border-color: var(--faint);
}
</style>
