<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { FeedItem } from '@contracts/view'
import AppIcon from './AppIcon.vue'
import { actions, connectedCount, selectPlatform, showToast, state } from '../store'
import { formatTime, initialOf } from '../../shared/format'

const list = ref<HTMLElement | null>(null)
const stick = ref(true)
const name = ref('测试观众')
const text = ref('')
const sending = ref(false)

const quick = [30, 60, 90]
const sampleNames = ['小满', '阿七', '团子', '空格', '汽水', '晚风', '白露', '十一']

onMounted(() => {
  scrollToBottom()
})

watch(
  () => state.snapshot?.feed.length ?? 0,
  () => {
    if (stick.value) void nextTick(scrollToBottom)
  }
)

function scrollToBottom(): void {
  const element = list.value
  if (element === null) return
  element.scrollTop = element.scrollHeight
}

function onScroll(): void {
  const element = list.value
  if (element === null) return
  stick.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48
}

async function send(): Promise<void> {
  const value = text.value.trim()
  if (value.length === 0 || sending.value) return
  sending.value = true
  const ok = await actions.simulateChat(name.value.trim() || '测试观众', value)
  sending.value = false
  if (ok) {
    text.value = ''
    stick.value = true
  }
}

async function sendQuick(power: number): Promise<void> {
  text.value = '!力度 ' + power
  await send()
}

async function fill(): Promise<void> {
  if (selectPlatform(state.snapshot, 'mock')?.status.phase !== 'connected') {
    showToast('先连接本地模拟', 'error')
    return
  }
  sending.value = true
  for (let index = 0; index < sampleNames.length; index += 1) {
    const power = 25 + index * 9
    await actions.simulateChat(sampleNames[index] ?? '观众', '!力度 ' + power)
  }
  sending.value = false
  stick.value = true
}

function feedClass(item: FeedItem): string {
  return 'feed-item kind-' + item.kind
}

function platformLabel(item: FeedItem): string {
  if (item.platform === 'bilibili') return 'B站'
  if (item.platform === 'mock') return '模拟'
  return '系统'
}
</script>

<template>
  <section class="card feed-card">
    <header class="card-head">
      <div>
        <h2>直播间弹幕</h2>
        <p>{{ connectedCount(state.snapshot) }} 个平台在线 · 最近 {{ state.snapshot?.feed.length ?? 0 }} 条</p>
      </div>
      <div class="head-actions">
        <button class="mini" @click="fill">填充 8 条</button>
        <button class="mini" @click="actions.clearFeed()">清空</button>
      </div>
    </header>

    <div ref="list" class="feed-list" @scroll="onScroll">
      <div v-if="(state.snapshot?.feed.length ?? 0) === 0" class="empty">
        <AppIcon name="platforms" :size="28" />
        <strong>还没有弹幕</strong>
        <span>连接本地模拟或 B站，消息会实时出现在这里。</span>
      </div>

      <article v-for="item in state.snapshot?.feed" :key="item.id" :class="feedClass(item)">
        <span class="avatar">{{ item.kind === 'system' ? 'S' : initialOf(item.userName) }}</span>
        <div class="content">
          <div class="meta">
            <strong>{{ item.userName }}</strong>
            <span class="tag">{{ platformLabel(item) }}</span>
            <time class="mono">{{ formatTime(item.at) }}</time>
          </div>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>

    <form class="composer" @submit.prevent="send">
      <div class="composer-row">
        <input v-model="name" class="name-input" maxlength="24" aria-label="测试观众名字" />
        <input v-model="text" class="text-input" maxlength="120" placeholder="输入一条模拟弹幕…" aria-label="模拟弹幕内容" />
        <button class="send" type="submit" :disabled="sending || text.trim().length === 0">
          <AppIcon name="plus" :size="15" />
        </button>
      </div>
      <div class="quick-row">
        <button v-for="power in quick" :key="power" type="button" class="chip" @click="sendQuick(power)">
          !力度 {{ power }}
        </button>
        <span class="tip">连接「本地模拟」后可发送</span>
      </div>
    </form>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 640px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--hairline);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.card-head p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.head-actions {
  display: flex;
  gap: var(--s-2);
}

.mini {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mute);
  font-size: 11px;
}

.mini:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.feed-list {
  flex: 1;
  min-height: 180px;
  overflow: auto;
  padding: var(--s-2) var(--s-3);
}

.feed-item {
  display: flex;
  gap: var(--s-2);
  padding: 8px var(--s-2);
  border-radius: 8px;
}

.feed-item:hover {
  background: var(--surface-hover);
}

.feed-item.kind-system {
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
}

.feed-item.kind-gift {
  border-left: 2px solid var(--bilibili);
}

.avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 50%;
  background: var(--surface-active);
  color: var(--body);
  font-size: 11px;
}

.content {
  min-width: 0;
  flex: 1;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.meta strong {
  overflow: hidden;
  color: var(--body);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex: 0 0 auto;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--surface-active);
  color: var(--faint);
  font-size: 9px;
  line-height: 14px;
}

.time {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}

p {
  margin: 2px 0 0;
  color: var(--body);
  font-size: 12px;
  line-height: 18px;
  word-break: break-word;
}

.kind-gift .tag {
  color: var(--bilibili);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  padding: 48px var(--s-5);
  color: var(--mute);
  text-align: center;
}

.empty strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.empty span {
  max-width: 220px;
  font-size: 11px;
  line-height: 17px;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4) var(--s-4);
  border-top: 1px solid var(--hairline);
}

.composer-row {
  display: flex;
  gap: var(--s-2);
}

.name-input {
  width: 88px;
  flex: 0 0 88px;
  height: 34px;
  padding: 0 var(--s-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--body);
  font-size: 11px;
}

.text-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 12px;
}

.send {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border: 1px solid var(--accent);
  border-radius: var(--r-control);
  background: var(--accent);
  color: var(--accent-ink);
}

.send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.quick-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-chip);
  background: transparent;
  color: var(--mute);
  font-family: var(--font-mono);
  font-size: 10px;
}

.chip:hover {
  border-color: var(--hairline-strong);
  color: var(--body);
}

.tip {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}
</style>
