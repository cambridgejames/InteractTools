<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardView from './views/DashboardView.vue'
import PlatformsView from './views/PlatformsView.vue'
import SettingsView from './views/SettingsView.vue'
import ToolsView from './views/ToolsView.vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import Toast from './components/Toast.vue'
import { initStore, state } from './store'

type Page = 'dashboard' | 'tools' | 'platforms' | 'settings'

const page = ref<Page>('dashboard')
const meta: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: '控制台', subtitle: '把弹幕变成今晚的节目' },
  tools: { title: '互动工具', subtitle: '一个内核，多个玩法' },
  platforms: { title: '平台连接', subtitle: '多平台并存，消息统一翻译' },
  settings: { title: '设置', subtitle: '窗口、数据与关于' }
}

const current = computed(() => meta[page.value])

onMounted(() => {
  void initStore()
})
</script>

<template>
  <div class="app-shell">
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
    <Toast />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  height: 100%;
  background: var(--canvas);
}

.app-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
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
