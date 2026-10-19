<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusPill from './StatusPill.vue'
import { actions, connectedCount, platformPhaseLabel, state } from '../store'

defineProps<{ title: string; subtitle: string }>()

const connected = computed(() => connectedCount(state.snapshot))
const mock = computed(() => state.snapshot?.platforms.find((item) => item.descriptor.id === 'mock'))
const bilibili = computed(() => state.snapshot?.platforms.find((item) => item.descriptor.id === 'bilibili'))
const maximized = ref(false)

async function toggleMaximize(): Promise<void> {
  maximized.value = await window.api.toggleMaximizeWindow()
}

function minimizeWindow(): void {
  void window.api.minimizeWindow()
}

function closeWindow(): void {
  void window.api.closeWindow()
}

function onTopbarDoubleClick(event: MouseEvent): void {
  if (event.target instanceof Element && event.target.closest('.actions, .window-controls') !== null) return
  void toggleMaximize()
}
</script>

<template>
  <header class="topbar" @dblclick="onTopbarDoubleClick">
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
      <button class="preview" @click="actions.previewActiveTool()">
        <AppIcon name="eye" :size="16" />
        预览结果
      </button>
    </div>

    <div class="window-controls">
      <button aria-label="最小化" @click="minimizeWindow">
        <AppIcon name="minus" :size="14" />
      </button>
      <button :aria-label="maximized ? '还原' : '最大化'" @click="toggleMaximize">
        <AppIcon :name="maximized ? 'restore' : 'maximize'" :size="14" />
      </button>
      <button class="close" aria-label="关闭" @click="closeWindow">
        <AppIcon name="close" :size="14" />
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
  padding: 0 8px 0 28px;
  border-bottom: 1px solid var(--hairline);
  background: var(--canvas-elevated);
  -webkit-app-region: drag;
  user-select: none;
}

.actions,
.window-controls,
.actions *,
.window-controls * {
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.window-controls button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mute);
}

.window-controls button:hover {
  background: var(--surface-hover);
  color: var(--ink);
}

.window-controls button.close:hover {
  background: var(--danger);
  color: var(--accent-ink);
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
