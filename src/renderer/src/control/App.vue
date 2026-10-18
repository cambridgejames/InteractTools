<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import FeedPanel from './components/FeedPanel.vue'
import AppIcon from './components/AppIcon.vue'
import DashboardView from './views/DashboardView.vue'
import PlatformsView from './views/PlatformsView.vue'
import SettingsView from './views/SettingsView.vue'
import ToolsView from './views/ToolsView.vue'
import Sidebar from './components/Sidebar.vue'
import ResultOverlay from './result/ResultOverlay.vue'
import Topbar from './components/Topbar.vue'
import Toast from './components/Toast.vue'
import { actions, initStore, state } from './store'

type Page = 'dashboard' | 'tools' | 'platforms' | 'settings'

const page = ref<Page>('dashboard')
const meta: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: '控制台', subtitle: '把弹幕变成今晚的节目' },
  tools: { title: '互动工具', subtitle: '一个内核，多个玩法' },
  platforms: { title: '平台连接', subtitle: '多平台并存，消息统一翻译' },
  settings: { title: '设置', subtitle: '窗口、数据与关于' }
}

const current = computed(() => meta[page.value])
const feedMode = computed(() => state.snapshot?.feedMode ?? 'full')

onMounted(() => {
  void initStore()
})
</script>

<template>
  <div class="app-shell" :class="'feed-' + feedMode">
    <Sidebar :page="page" @navigate="page = $event" />
    <div class="app-main">
      <Topbar :title="current.title" :subtitle="current.subtitle" />
      <main class="app-content">
        <div v-if="state.loading" class="loading">正在连接内核…</div>
        <template v-else>
          <DashboardView v-if="page === 'dashboard'" @navigate="page = $event" />
          <ToolsView v-else-if="page === 'tools'" @navigate="page = $event" />
          <PlatformsView v-else-if="page === 'platforms'" />
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
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
  background: var(--canvas);
}

.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.feed-sidebar {
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
  font-size: 11px;
  letter-spacing: 2px;
}

.feed-rail strong {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
}

@media (max-width: 1180px) {
  .app-shell {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
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
  font-size: 12px;
}
</style>
