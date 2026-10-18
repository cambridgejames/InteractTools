<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { actions } from '../store'

type Page = 'dashboard' | 'tools' | 'platforms' | 'settings'

defineProps<{ page: Page }>()
const emit = defineEmits<{ navigate: [page: Page] }>()

const nav: Array<{ id: Page; label: string; icon: 'dashboard' | 'tools' | 'platforms' | 'settings' }> = [
  { id: 'dashboard', label: '控制台', icon: 'dashboard' },
  { id: 'tools', label: '互动工具', icon: 'tools' },
  { id: 'platforms', label: '平台连接', icon: 'platforms' },
  { id: 'settings', label: '设置', icon: 'settings' }
]
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">1017</div>
      <div class="brand-text">
        <strong>1017</strong>
        <span>互动工坊</span>
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
      <button class="data-link" @click="actions.openDataFolder()">
        <AppIcon name="folder" :size="14" />
        <span>数据目录</span>
      </button>
      <span class="version mono">v0.1.0</span>
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

.brand {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: 72px;
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
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: -0.4px;
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
  font-size: 11px;
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
  padding: var(--s-4);
  border-top: 1px solid var(--hairline);
}

.data-link {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mute);
  font-size: 12px;
}

.data-link:hover {
  color: var(--body);
}

.version {
  color: var(--faint);
  font-size: 11px;
}
</style>
