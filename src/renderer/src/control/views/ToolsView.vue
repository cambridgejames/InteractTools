<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ToolCatalogItem } from '@contracts/view'
import { DICE_FACES } from '@contracts/dice'
import AppIcon from '../components/AppIcon.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { actions, selectDice, selectTool, state } from '../store'
import { highlightText, rankTools, tokenizeQuery } from '../tool-search'

const emit = defineEmits<{ navigate: [page: 'dashboard'] }>()

const query = ref('')
const tokens = computed(() => tokenizeQuery(query.value))
const catalog = computed(() => state.snapshot?.toolCatalog ?? [])
const rows = computed(() => rankTools(catalog.value, query.value))
const dice = computed(() => selectDice(state.snapshot))
const wheel = computed(() => selectTool(state.snapshot, 'wheel'))
const vote = computed(() => selectTool(state.snapshot, 'vote'))

const tagsByTool: Record<string, readonly string[]> = {
  dice: DICE_FACES.map((faces) => 'D' + String(faces)),
  wheel: ['主播手动', '无命令', '2–16 格'],
  vote: ['弹幕互动', '2–8 项', '实时票数']
}

function historyOf(tool: ToolCatalogItem): string {
  if (!tool.enabled) return '已关闭'
  if (tool.toolId === 'dice') return dice.value ? dice.value.history.length + ' 条记录' : '加载中'
  if (tool.toolId === 'wheel') return wheel.value?.toolId === 'wheel' ? wheel.value.history.length + ' 条记录' : '加载中'
  if (tool.toolId === 'vote') return vote.value?.toolId === 'vote' ? vote.value.history.length + ' 条记录' : '加载中'
  return ''
}

function openTool(tool: ToolCatalogItem): void {
  if (!tool.enabled) return
  actions.selectTool(tool.toolId)
  emit('navigate', 'dashboard')
}

async function toggleTool(tool: ToolCatalogItem, enabled: boolean): Promise<void> {
  await actions.setToolEnabled(tool.toolId, enabled)
}

function clearSearch(): void {
  query.value = ''
}

function highlight(text: string): ReturnType<typeof highlightText> {
  return highlightText(text, tokens.value)
}
</script>

<template>
  <div class="tools">
    <div class="tools-head">
      <div class="search">
        <AppIcon name="search" :size="15" />
        <input
          v-model="query"
          type="search"
          placeholder="搜索工具、玩法或关键词…"
          aria-label="搜索互动工具"
          spellcheck="false"
        />
        <button v-if="query.length > 0" class="clear" aria-label="清空搜索" @click="clearSearch">
          <AppIcon name="close" :size="13" />
        </button>
        <span v-if="query.length > 0" class="search-count">{{ rows.length }} / {{ catalog.length }}</span>
      </div>
    </div>

    <section
      v-for="item in rows"
      :key="item.tool.toolId"
      class="tool-card"
      :class="{ active: item.tool.enabled, off: !item.tool.enabled }"
    >
      <header>
        <span class="icon"><AppIcon :name="item.tool.icon === 'dice' || item.tool.icon === 'wheel' || item.tool.icon === 'vote' ? item.tool.icon : 'tools'" :size="20" /></span>
        <span class="card-controls">
          <span class="status" :class="{ off: !item.tool.enabled }">{{ item.tool.enabled ? '已启用' : '已关闭' }}</span>
          <ToggleSwitch
            :model-value="item.tool.enabled"
            :label="'启用' + item.tool.name"
            @update:model-value="(enabled) => toggleTool(item.tool, enabled)"
          />
        </span>
      </header>
      <h2>
        <template v-for="(part, index) in highlight(item.tool.name)" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </h2>
      <p>
        <template v-for="(part, index) in highlight(query.length === 0 ? item.tool.description : item.snippet)" :key="index">
          <mark v-if="part.match">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <div class="tags">
        <span v-for="tag in tagsByTool[item.tool.toolId] ?? []" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <footer>
        <span class="meta">{{ historyOf(item.tool) }}</span>
        <button class="open" :disabled="!item.tool.enabled" @click="openTool(item.tool)">
          {{ item.tool.enabled ? '去控制台' : '启用后使用' }}
        </button>
      </footer>
    </section>

    <section v-if="query.length === 0" class="tool-card muted-card">
      <header>
        <span class="icon"><AppIcon name="gift" :size="20" /></span>
        <span class="status soon">即将推出</span>
      </header>
      <h2>礼物答谢</h2>
      <p>礼物队列、防刷屏、语音播报。等第一个工具稳定后接入。</p>
      <div class="tags">
        <span class="tag">礼物</span>
        <span class="tag">TTS</span>
      </div>
      <footer>
        <span class="meta">规划中</span>
      </footer>
    </section>

    <section v-if="rows.length === 0" class="empty">
      <AppIcon name="search" :size="26" />
      <strong>没有匹配的互动工具</strong>
      <span>换一个关键词，或清空搜索查看全部工具。</span>
    </section>
  </div>
</template>

<style scoped>
.tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  max-width: var(--content-max);
  margin: 0 auto;
}

.tools-head {
  grid-column: 1 / -1;
}

.search {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 40px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--surface);
  color: var(--mute);
}

.search:focus-within {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--hairline));
}

.search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
}

.search input::placeholder {
  color: var(--faint);
}

.clear {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mute);
}

.clear:hover {
  background: var(--surface-hover);
  color: var(--ink);
}

.search-count {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 10px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-height: 240px;
  padding: var(--s-5);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.tool-card.active {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--hairline));
}

.tool-card.off {
  opacity: 0.62;
}

.tool-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.card-controls {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--accent);
}

.status {
  padding: 3px 8px;
  border-radius: var(--r-chip);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 500;
}

.status.off {
  background: var(--surface-active);
  color: var(--faint);
}

.status.soon {
  background: var(--surface-active);
  color: var(--faint);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

p {
  margin: 0;
  color: var(--mute);
  font-size: 12px;
  line-height: 18px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 10px;
}

footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.meta {
  color: var(--faint);
  font-size: 11px;
}

.open {
  height: 28px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--body);
  font-size: 11px;
}

.open:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.open:disabled {
  cursor: not-allowed;
  color: var(--faint);
}

mark {
  border-radius: 2px;
  background: color-mix(in srgb, var(--accent) 24%, transparent);
  color: var(--ink);
}

.empty {
  grid-column: 1 / -1;
  display: grid;
  justify-items: center;
  gap: var(--s-2);
  padding: 48px;
  border: 1px dashed var(--hairline-strong);
  border-radius: var(--r-card);
  color: var(--faint);
}

.empty strong {
  color: var(--body);
  font-size: 14px;
  font-weight: 500;
}

.empty span {
  font-size: 11px;
}

.muted-card {
  opacity: 0.62;
}

@media (min-width: 1500px) {
  .tools {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .tools {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
