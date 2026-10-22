<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

type Page = 'dashboard' | 'tools' | 'settings'
type TourIcon = 'settings' | 'dice' | 'vote' | 'keyboard' | 'globe'

interface TourStep {
  readonly icon: TourIcon
  readonly title: string
  readonly body: string
  readonly hint: string
  readonly page: Page
  readonly target: string
  readonly open?: string
}

const steps: readonly TourStep[] = [
  {
    icon: 'settings',
    title: '先打开设置',
    body: '点左侧「设置」，所有平台连接、网络和外观都在这里。这个高亮就是入口。',
    hint: '所有平台都只读，不会替你发言或送礼。',
    page: 'dashboard',
    target: '[data-tour="nav-settings"]'
  },
  {
    icon: 'dice',
    title: '回到控制台选玩法',
    body: '这里切换投骰子、转转盘和弹幕投票。点一下工具卡片就能换玩法。',
    hint: '参数会自动保存，下次打开还是这套设置。',
    page: 'dashboard',
    target: '[data-tour="tool-switcher"]'
  },
  {
    icon: 'vote',
    title: '眼睛看右边',
    body: '这里就是实时弹幕。向上翻历史时不会强制拉回底部，有新消息会出现提示按钮。',
    hint: '进场观众只占底部一行，不抢聊天历史。',
    page: 'dashboard',
    target: '[data-tour="feed"]'
  },
  {
    icon: 'globe',
    title: '网络在这里测',
    body: '进入设置 → 网络，点「测试连通性」会分别显示 B站和抖音的连通状态与延迟。',
    hint: '内网自签名代理可以打开 SSL 跳过校验。',
    page: 'settings',
    target: '[data-tour="network-test"]',
    open: '[data-tour="settings-network"]'
  },
  {
    icon: 'keyboard',
    title: '最后绑快捷键',
    body: '设置 → 快捷键，默认全空。点输入框后按下组合键即可，关闭/退出组合不会被接受。',
    hint: '直播前先试一遍，确认不会误触。',
    page: 'settings',
    target: '[data-tour="settings-shortcuts"]',
    open: '[data-tour="settings-shortcuts"]'
  }
]

const step = ref(0)
const target = ref('')
const cardStyle = ref({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' })
const spotStyle = ref({ display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' })
const panels = ref([
  { display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' },
  { display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' },
  { display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' },
  { display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' }
])
const current = computed<TourStep>(() => steps[step.value] ?? steps[0] ?? {
  icon: 'settings',
  title: '操作指引',
  body: '按下一步继续。',
  hint: 'Esc 可以跳过。',
  page: 'dashboard',
  target: ''
})
const last = computed(() => step.value === steps.length - 1)
const emit = defineEmits<{ done: []; navigate: [page: Page] }>()

function locate(): void {
  const selector = current.value.target
  const element = selector.length > 0 ? document.querySelector<HTMLElement>(selector) : null
  if (element === null) {
    target.value = ''
    spotStyle.value = { display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' }
    panels.value = panels.value.map(() => ({ display: 'none', left: '0px', top: '0px', width: '0px', height: '0px' }))
    cardStyle.value = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    return
  }
  element.scrollIntoView({ block: 'center', inline: 'nearest' })
  const rect = element.getBoundingClientRect()
  const pad = 8
  const left = Math.max(0, rect.left - pad)
  const top = Math.max(0, rect.top - pad)
  const right = Math.min(window.innerWidth, rect.right + pad)
  const bottom = Math.min(window.innerHeight, rect.bottom + pad)
  const width = Math.max(0, right - left)
  const height = Math.max(0, bottom - top)
  target.value = selector
  spotStyle.value = { display: 'block', left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }
  panels.value = [
    { display: 'block', left: '0px', top: '0px', width: '100vw', height: top + 'px' },
    { display: 'block', left: '0px', top: bottom + 'px', width: '100vw', height: Math.max(0, window.innerHeight - bottom) + 'px' },
    { display: 'block', left: '0px', top: top + 'px', width: left + 'px', height: height + 'px' },
    { display: 'block', left: right + 'px', top: top + 'px', width: Math.max(0, window.innerWidth - right) + 'px', height: height + 'px' }
  ]
  const cardWidth = 380
  const below = bottom + 18
  const cardTop = below + 190 < window.innerHeight ? below : Math.max(18, top - 206)
  cardStyle.value = {
    left: Math.max(18, Math.min(rect.left, window.innerWidth - cardWidth - 18)) + 'px',
    top: cardTop + 'px',
    transform: 'none'
  }
}

async function goTo(index: number): Promise<void> {
  step.value = Math.max(0, Math.min(steps.length - 1, index))
  const currentStep = steps[step.value]
  if (currentStep === undefined) return
  emit('navigate', currentStep.page)
  await nextTick()
  if (currentStep.open !== undefined) {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(currentStep.open ?? '')?.click()
      window.setTimeout(locate, 120)
    }, 80)
  }
  window.setTimeout(locate, 180)
}

function next(): void {
  if (last.value) {
    emit('done')
    return
  }
  void goTo(step.value + 1)
}

function previous(): void {
  void goTo(step.value - 1)
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('done')
  if (event.key === 'ArrowRight') next()
  if (event.key === 'ArrowLeft') previous()
}

function onViewportChange(): void {
  locate()
}

watch(step, () => locate())

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
  void goTo(0)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <Teleport to="body">
    <div class="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div
        v-for="(panel, index) in panels"
        :key="index"
        class="tour-panel"
        :style="panel"
      />
      <div v-if="spotStyle.display === 'block'" class="tour-spot" :style="spotStyle" />

      <section class="tour-card" :style="cardStyle">
        <header class="tour-head">
          <span class="tour-icon"><AppIcon :name="current.icon" :size="18" /></span>
          <span class="tour-count">{{ String(step + 1).padStart(2, '0') }} / {{ String(steps.length).padStart(2, '0') }}</span>
        </header>

        <h2 id="tour-title">{{ current.title }}</h2>
        <p class="tour-body">{{ current.body }}</p>
        <p class="tour-hint">{{ current.hint }}</p>

        <footer class="tour-foot">
          <div class="tour-dots" aria-label="教程进度">
            <button
              v-for="(item, index) in steps"
              :key="item.title"
              class="tour-dot"
              :class="{ active: index === step }"
              type="button"
              :aria-label="'第 ' + String(index + 1) + ' 步'"
              @click="goTo(index)"
            />
          </div>
          <div class="tour-actions">
            <button class="tour-skip" type="button" @click="emit('done')">跳过</button>
            <button v-if="step > 0" class="tour-prev" type="button" @click="previous">上一步</button>
            <button class="tour-next" type="button" @click="next">{{ last ? '开始使用' : '下一步' }}</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
}

.tour-panel {
  position: fixed;
  z-index: 1;
  background: var(--overlay-veil);
  pointer-events: auto;
}

.tour-spot {
  position: fixed;
  z-index: 2;
  border: 1px solid var(--accent);
  border-radius: var(--r-control);
  box-shadow: 0 0 0 3px var(--accent-soft), var(--glow-accent);
  pointer-events: none;
  transition: all var(--dur-fast) var(--ease-out);
}

.tour-card {
  position: fixed;
  z-index: 3;
  width: min(380px, calc(100vw - 36px));
  padding: var(--s-4);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-card);
  background: var(--canvas-elevated);
  box-shadow: var(--shadow-pop);
  pointer-events: auto;
}

.tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tour-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--hairline));
  border-radius: var(--r-icon);
  background: var(--accent-soft);
  color: var(--accent);
}

.tour-count {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 12px;
}

h2 {
  margin: var(--s-3) 0 var(--s-1);
  color: var(--ink);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.tour-body {
  margin: 0;
  color: var(--body);
  font-size: 14px;
  line-height: 21px;
}

.tour-hint {
  margin: var(--s-2) 0 0;
  padding: var(--s-2) var(--s-3);
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
  color: var(--mute);
  font-size: 12px;
  line-height: 18px;
}

.tour-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin-top: var(--s-4);
}

.tour-dots {
  display: flex;
  gap: 6px;
}

.tour-dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--hairline-strong);
}

.tour-dot.active {
  width: 18px;
  border-radius: var(--r-chip);
  background: var(--accent);
}

.tour-actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.tour-skip,
.tour-prev,
.tour-next {
  height: 30px;
  padding: 0 var(--s-3);
  border-radius: var(--r-control);
  font-size: 12px;
}

.tour-skip,
.tour-prev {
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--mute);
}

.tour-next {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 500;
}

.tour-skip:hover,
.tour-prev:hover {
  color: var(--body);
  border-color: var(--hairline-strong);
}
</style>
