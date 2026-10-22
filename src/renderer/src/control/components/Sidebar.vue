<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'
import { state } from '../store'

const isMac = window.api.platform === 'darwin'

type Page = 'dashboard' | 'tools' | 'settings'

defineProps<{ page: Page }>()
const emit = defineEmits<{ navigate: [page: Page] }>()

const nav: Array<{ id: Page; label: string; icon: 'dashboard' | 'tools' }> = [
  { id: 'dashboard', label: '控制台', icon: 'dashboard' },
  { id: 'tools', label: '互动工具', icon: 'tools' }
]
</script>

<template>
  <aside class="sidebar" :class="{ mac: isMac }">
    <div class="brand">
      <div class="brand-mark"><BrandMark :size="24" /></div>
      <div class="brand-text">
        <strong>互动工坊</strong>
        <span>直播间互动控制台</span>
      </div>
    </div>

    <nav class="nav" aria-label="主导航">
      <button
        v-for="item in nav"
        :key="item.id"
        class="nav-item"
        :class="{ active: page === item.id }"
        :aria-current="page === item.id ? 'page' : undefined"
        @click="emit('navigate', item.id)"
      >
        <AppIcon :name="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-foot">
      <button
        class="nav-item settings-link"
        :class="{ active: page === 'settings' }"
        data-tour="nav-settings"
        :aria-current="page === 'settings' ? 'page' : undefined"
        @click="emit('navigate', 'settings')"
      >
        <AppIcon name="settings" :size="18" />
        <span>设置</span>
      </button>
      <span class="version mono">v{{ state.update?.currentVersion ?? '—' }}</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--canvas-elevated);
  border-right: 1px solid var(--hairline);
}

.sidebar.mac .brand {
  padding-left: 84px;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: var(--topbar-height);
  padding: 0 var(--s-4);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--r-control);
  background: var(--accent);
  color: var(--accent-ink);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  color: var(--ink);
  font-size: 15px;
  letter-spacing: -0.2px;
}

.brand-text span {
  color: var(--mute);
  font-size: 12px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  padding: var(--s-2) var(--s-2);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: 40px;
  padding: 0 var(--s-3);
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--mute);
  text-align: left;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.nav-item.active {
  background: var(--surface-active);
  color: var(--ink);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 2px;
  height: 16px;
  border-radius: 999px;
  background: var(--accent);
}

.sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin-top: auto;
  padding: var(--s-2);
  border-top: 1px solid var(--hairline);
}

.settings-link {
  width: 100%;
}

.version {
  padding-left: var(--s-3);
  color: var(--faint);
  font-size: 12px;
}
</style>
