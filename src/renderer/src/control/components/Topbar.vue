<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusPill from './StatusPill.vue'
import { actions, connectedCount, platformPhaseLabel, state } from '../store'

defineProps<{ title: string; subtitle: string }>()

const connected = computed(() => connectedCount(state.snapshot))
const showActivePlatforms = computed(() => state.snapshot?.ui.showActivePlatforms ?? true)
const activePlatforms = computed(() =>
  (state.snapshot?.platforms ?? []).filter(
    (item) =>
      item.status.phase === 'connected' ||
      item.status.phase === 'connecting' ||
      item.status.phase === 'reconnecting'
  )
)

function platformLabel(id: string): string {
  if (id === 'bilibili') return 'B站'
  if (id === 'douyin') return '抖音'
  if (id === 'mock') return '模拟'
  return '平台'
}
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
      <div v-if="showActivePlatforms" class="pills">
        <StatusPill
          v-for="platform in activePlatforms"
          :key="platform.descriptor.id"
          :phase="platform.status.phase"
          :label="platformLabel(platform.descriptor.id) + ' · ' + platformPhaseLabel(platform.status.phase)"
        />
      </div>
      <button class="preview" @click="actions.previewActiveTool()">
        <AppIcon name="eye" :size="16" />
        预览结果
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
  -webkit-app-region: drag;
  user-select: none;
}

.actions,
.actions * {
  -webkit-app-region: no-drag;
}

.topbar.feed-global {
  padding-right: 150px;
}

.topbar.mac {
  padding-right: 28px;
}

@media (max-width: 1180px) {
  .topbar {
    padding-right: 150px;
  }

  .topbar.mac {
    padding-right: 28px;
  }
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
  font-size: 12px;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12px;
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
  font-size: 13px;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.preview:hover {
  background: var(--surface-hover);
  border-color: var(--faint);
}
</style>
