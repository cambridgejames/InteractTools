<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FeedPanel from './components/FeedPanel.vue'
import AppIcon from './components/AppIcon.vue'
import DashboardView from './views/DashboardView.vue'
import SettingsView from './views/SettingsView.vue'
import ToolsView from './views/ToolsView.vue'
import Sidebar from './components/Sidebar.vue'
import ResultOverlay from './result/ResultOverlay.vue'
import Topbar from './components/Topbar.vue'
import Toast from './components/Toast.vue'
import { actions, initStore, state } from './store'

type Page = 'dashboard' | 'tools' | 'settings'

const page = ref<Page>('dashboard')
const meta: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: '控制台', subtitle: '把弹幕变成今晚的节目' },
  tools: { title: '互动工具', subtitle: '一个内核，多个玩法' },
  settings: { title: '设置', subtitle: '平台、网络、窗口与数据' }
}

const current = computed(() => meta[page.value])
const feedMode = computed(() => state.snapshot?.feedMode ?? 'full')
const isMac = window.api.platform === 'darwin'

let unsubscribeNavigate: (() => void) | null = null

onMounted(() => {
  void initStore()
  unsubscribeNavigate = window.api.onNavigate((target) => {
    page.value = target
  })
})

onUnmounted(() => {
  unsubscribeNavigate?.()
})
</script>

<template>
  <div class="app-shell" :class="['feed-' + feedMode, { mac: isMac }]">
    <Sidebar class="app-sidebar" :page="page" @navigate="page = $event" />
    <Topbar
      class="app-topbar"
      :title="current.title"
      :subtitle="current.subtitle"
      :class="{ mac: isMac, 'feed-global': feedMode !== 'full' }"
    />
    <div class="app-main">
      <main class="app-content">
        <div v-if="state.loading" class="loading">正在连接内核…</div>
        <template v-else>
          <DashboardView v-if="page === 'dashboard'" @navigate="page = $event" />
          <ToolsView v-else-if="page === 'tools'" @navigate="page = $event" />
          <SettingsView v-else />
        </template>
      </main>
    </div>
    <FeedPanel
      v-if="feedMode === 'full'"
      class="feed-sidebar"
      @collapse="actions.setFeedMode('collapsed')"
    />
    <aside
      v-else-if="feedMode === 'collapsed'"
      class="feed-rail"
      title="展开弹幕栏"
      @click="actions.setFeedMode('full')"
    >
      <AppIcon name="chevron" :size="14" />
      <span>弹幕</span>
      <strong>{{ state.snapshot?.feed.length ?? 0 }}</strong>
    </aside>
    <ResultOverlay
      v-if="state.resultPopup"
      :result="state.resultPopup"
      @close="actions.dismissOverlay"
    />
    <Toast />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr) var(--feed-width);
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  height: 100%;
  background: var(--canvas);
}

.app-sidebar {
  grid-column: 1;
  grid-row: 1 / 3;
}

.app-topbar {
  grid-column: 2;
  grid-row: 1;
}

.app-shell.feed-collapsed .app-topbar,
.app-shell.feed-hidden .app-topbar {
  grid-column: 2 / -1;
}

.app-main {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.feed-sidebar {
  grid-column: 3;
  grid-row: 1 / 3;
  height: 100%;
  min-height: 0;
  border-left: 1px solid var(--hairline);
}

.app-shell.feed-collapsed {
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr) 44px;
}

.app-shell.feed-hidden {
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
}

.feed-rail {
  grid-column: 3;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  height: 100%;
  padding: var(--s-4) 0;
  border-left: 1px solid var(--hairline);
  background: var(--canvas-elevated);
  color: var(--mute);
  cursor: pointer;
}

.feed-rail:hover {
  color: var(--accent);
}

.feed-rail span {
  writing-mode: vertical-rl;
  font-size: 12px;
  letter-spacing: 2px;
}

.feed-rail strong {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 1180px) {
  .app-shell {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  }

  .app-topbar,
  .app-main {
    grid-column: 2 / -1;
  }

  .feed-sidebar,
  .feed-rail {
    display: none;
  }

  .app-shell.feed-collapsed,
  .app-shell.feed-hidden {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  }
}

.app-content {
  flex: 1;
  overflow: auto;
  padding: var(--s-6) 28px var(--s-8);
  scroll-behavior: smooth;
}

.loading {
  display: grid;
  place-items: center;
  height: 60vh;
  color: var(--mute);
  font-size: 13px;
}
</style>
