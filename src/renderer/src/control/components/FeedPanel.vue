<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { FeedItem } from '@contracts/view'
import AppIcon from './AppIcon.vue'
import { actions, connectedCount, selectPlatform, showToast, state } from '../store'
import { formatTime, initialOf } from '../../shared/format'

const emit = defineEmits<{ collapse: [] }>()
const isMac = window.api.platform === 'darwin'

const ROW_HEIGHT = 72
const OVERSCAN = 4
const MEMBER_TICKER_TTL_MS = 5_000

const list = ref<HTMLElement | null>(null)
const stick = ref(true)
const unread = ref(0)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const name = ref('测试观众')
const text = ref('')
const sending = ref(false)
const now = ref(Date.now())
let resizeObserver: ResizeObserver | null = null
let memberClock: ReturnType<typeof setInterval> | null = null

const showFeedPlatforms = computed(() => state.snapshot?.ui.showFeedPlatforms ?? false)
const showMockLabel = computed(() => state.snapshot?.ui.showMockLabel ?? true)
const feed = computed(() => state.snapshot?.feed ?? [])
const chatFeed = computed(() => feed.value)
const recentMemberNames = computed(() => {
  const names: string[] = []
  const members = state.snapshot?.recentMembers ?? []
  for (let index = members.length - 1; index >= 0 && names.length < 3; index -= 1) {
    const member = members[index]
    if (member === undefined || now.value - member.at > MEMBER_TICKER_TTL_MS) continue
    if (names.includes(member.userName)) continue
    names.push(member.userName)
  }
  return names.reverse()
})
const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN)
)
const visibleCount = computed(() => Math.ceil(viewportHeight.value / ROW_HEIGHT) + OVERSCAN * 2)
const visibleFeed = computed(() => chatFeed.value.slice(startIndex.value, startIndex.value + visibleCount.value))
const topPad = computed(() => startIndex.value * ROW_HEIGHT)
const bottomPad = computed(() =>
  Math.max(0, (chatFeed.value.length - startIndex.value - visibleFeed.value.length) * ROW_HEIGHT)
)

const sampleNames = ['小满', '阿七', '团子', '空格', '汽水', '晚风', '白露', '十一']
const sampleLines = ['主播好', '这骰子有点东西', '来了来了', '666', '再开一轮', '这力度稳了', '晚上好', '冲冲冲']

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  if (list.value !== null) {
    resizeObserver = new ResizeObserver(updateViewport)
    resizeObserver.observe(list.value)
  }
  memberClock = setInterval(() => {
    now.value = Date.now()
  }, 1_000)
  scrollToBottom()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  resizeObserver?.disconnect()
  if (memberClock !== null) clearInterval(memberClock)
})

watch(
  () => feed.value.at(-1)?.id,
  (id) => {
    if (id === undefined) {
      unread.value = 0
      return
    }
    if (stick.value) void nextTick(scrollToBottom)
    else unread.value = Math.min(999, unread.value + 1)
  }
)

function updateViewport(): void {
  viewportHeight.value = list.value?.clientHeight ?? 0
}

function scrollToBottom(): void {
  const element = list.value
  if (element === null) return
  stick.value = true
  unread.value = 0
  element.scrollTop = element.scrollHeight
  scrollTop.value = element.scrollTop
}

function onScroll(): void {
  const element = list.value
  if (element === null) return
  scrollTop.value = element.scrollTop
  const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48
  stick.value = atBottom
  if (atBottom) unread.value = 0
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
    unread.value = 0
    void nextTick(scrollToBottom)
  }
}

async function fill(): Promise<void> {
  if (selectPlatform(state.snapshot, 'mock')?.status.phase !== 'connected') {
    showToast('先连接本地模拟', 'error')
    return
  }
  sending.value = true
  for (let index = 0; index < sampleNames.length; index += 1) {
    await actions.simulateChat(sampleNames[index] ?? '观众', sampleLines[index] ?? '666')
  }
  sending.value = false
  stick.value = true
  unread.value = 0
  void nextTick(scrollToBottom)
}

function feedClass(item: FeedItem): string {
  return 'feed-item kind-' + item.kind
}

function platformLabel(platform: FeedItem['platform']): string {
  if (platform === 'bilibili') return 'B站'
  if (platform === 'douyin') return '抖音'
  return ''
}


</script>

<template>
  <section class="card feed-card" :class="{ mac: isMac }">
    <header class="card-head">
      <div>
        <h2>直播间弹幕</h2>
        <p>{{ connectedCount(state.snapshot) }} 个平台在线 · 最近 {{ state.snapshot?.feed.length ?? 0 }} 条</p>
      </div>
    </header>

    <div class="feed-tools">
      <button class="mini" @click="fill">填充 8 条</button>
      <button class="mini" @click="actions.clearFeed()">清空</button>
      <button class="mini collapse" title="收起弹幕栏" @click="emit('collapse')">
        <AppIcon name="chevron" :size="14" />
      </button>
    </div>

    <div class="feed-viewport">
      <div ref="list" class="feed-list" @scroll="onScroll">
      <div v-if="chatFeed.length === 0" class="empty">
        <AppIcon name="platforms" :size="28" />
        <strong>{{ recentMemberNames.length > 0 ? '观众正在进入' : '还没有弹幕' }}</strong>
        <span>连接平台后，弹幕会实时出现在这里。</span>
      </div>

      <div :style="{ height: topPad + 'px' }" />
      <article
        v-for="item in visibleFeed"
        :key="item.id"
        :class="feedClass(item)"
        :style="{ height: ROW_HEIGHT + 'px' }"
      >
        <span class="avatar">{{ item.kind === 'system' ? 'S' : initialOf(item.userName) }}</span>
        <div class="content">
          <div class="meta">
            <strong>{{ item.userName }}</strong>
            <span v-if="item.platform === 'mock' && showMockLabel" class="sim-tag">模拟</span>
            <span
              v-else-if="item.platform !== 'mock' && item.platform !== 'system' && showFeedPlatforms"
              class="source-tag"
            >
              {{ platformLabel(item.platform) }}
            </span>
            <span v-if="item.kind === 'gift'" class="type-tag">礼物</span>
            <time class="mono">{{ formatTime(item.at) }}</time>
          </div>
          <p>{{ item.text }}</p>
        </div>
      </article>
        <div :style="{ height: bottomPad + 'px' }" />
      </div>

      <button v-if="!stick && unread > 0" class="new-messages" type="button" @click="scrollToBottom">
        <AppIcon name="chevron" :size="13" />
        {{ unread }} 条新弹幕
      </button>
    </div>

    <div v-if="recentMemberNames.length > 0" class="member-ticker" aria-live="polite">
      <span class="member-label">进场</span>
      <span class="member-text">
        欢迎 <strong>{{ recentMemberNames.join('、') }}</strong> 进入直播间
      </span>
    </div>

    <form class="composer" @submit.prevent="send">
      <div class="composer-row">
        <input v-model="name" class="name-input" maxlength="24" aria-label="测试观众名字" />
        <input v-model="text" class="text-input" maxlength="120" placeholder="输入一条模拟弹幕…" aria-label="模拟弹幕内容" />
        <button class="send" type="submit" aria-label="发送模拟弹幕" :disabled="sending || text.trim().length === 0">
          <AppIcon name="send" :size="14" />
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border: 0;
  border-radius: 0;
  background: var(--canvas-elevated);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  min-height: var(--topbar-height);
  padding: 0 150px 0 var(--s-5);
  border-bottom: 1px solid var(--hairline);
}

.feed-card.mac .card-head {
  padding-right: var(--s-5);
}

.feed-tools {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 4px var(--s-5);
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
  font-size: 12px;
}

.mini {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mute);
  font-size: 12px;
}

.mini:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.feed-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
}

.feed-list {
  height: 100%;
  overflow: auto;
  padding: var(--s-2) var(--s-3);
}

.new-messages {
  position: absolute;
  bottom: 12px;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--hairline));
  border-radius: var(--r-chip);
  background: var(--surface-active);
  box-shadow: var(--shadow-pop);
  color: var(--accent);
  font-size: 12px;
  transform: translateX(-50%);
}

.new-messages:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
}

.feed-item {
  display: flex;
  gap: var(--s-2);
  height: 72px;
  overflow: hidden;
  padding: 8px var(--s-2);
  border-radius: var(--r-control);
}

.feed-item .content p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.feed-item:hover {
  background: var(--surface-hover);
}

.feed-item.kind-system {
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
}

.feed-item.kind-gift {
  background: color-mix(in srgb, var(--warning) 4%, transparent);
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
  font-size: 12px;
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
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sim-tag,
.type-tag,
.source-tag {
  flex: 0 0 auto;
  padding: 0 5px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
}

.sim-tag {
  border-color: color-mix(in srgb, var(--info) 40%, var(--hairline));
  background: color-mix(in srgb, var(--info) 10%, transparent);
  color: var(--info);
}

.type-tag {
  border-color: color-mix(in srgb, var(--warning) 40%, var(--hairline));
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
}

.source-tag {
  border-color: var(--hairline);
  color: var(--mute);
}

.time {
  margin-left: auto;
  color: var(--faint);
  font-size: 12px;
}

p {
  margin: 2px 0 0;
  color: var(--body);
  font-size: 14px;
  line-height: 20px;
  word-break: break-word;
}

.member-ticker {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 34px;
  padding: 0 var(--s-4);
  border-top: 1px solid var(--hairline);
  background: var(--surface);
  color: var(--mute);
  font-size: 12px;
}

.member-label {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: var(--r-chip);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
}

.member-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-text strong {
  color: var(--body);
  font-weight: 500;
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
  font-size: 14px;
  font-weight: 500;
}

.empty span {
  max-width: 220px;
  font-size: 12px;
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
  font-size: 12px;
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
  font-size: 13px;
}

.send {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  align-self: center;
  border: 1px solid var(--accent);
  border-radius: var(--r-control);
  background: var(--accent);
  color: var(--accent-ink);
}

.send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
