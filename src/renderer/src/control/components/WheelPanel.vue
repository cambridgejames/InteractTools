<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WheelToolView } from '@contracts/view'
import AppIcon from './AppIcon.vue'
import { actions, showToast } from '../store'
import { formatTime } from '../../shared/format'

const props = defineProps<{ view: WheelToolView }>()

const segmentsText = ref(props.view.config.segments.join('\n'))
const duration = ref(props.view.config.spinDurationSeconds)

watch(
  () => props.view.config.segments,
  (segments) => {
    segmentsText.value = segments.join('\n')
  }
)
watch(
  () => props.view.config.spinDurationSeconds,
  (value) => {
    duration.value = value
  }
)


const spinning = computed(() => props.view.phase === 'spinning')
const phaseText = computed(() => {
  switch (props.view.phase) {
    case 'spinning':
      return '旋转中'
    case 'result':
      return '已停稳'
    case 'idle':
      return '待旋转'
    default:
      return '待旋转'
  }
})
const displayedResult = computed(() => {
  if (props.view.phase === 'spinning') return '旋转中…'
  return props.view.lastResult?.label ?? null
})

const wheelRotation = ref(0)
const spinDuration = ref(0)

watch(
  [() => props.view.phase, () => props.view.currentSpin?.spinId],
  () => {
    const spin = props.view.currentSpin
    if (props.view.phase !== 'spinning' || spin === null) return

    const step = 360 / Math.max(1, props.view.segments.length)
    const targetMod = ((-(spin.resultIndex + 0.5) * step) % 360 + 360) % 360
    const currentMod = ((wheelRotation.value % 360) + 360) % 360
    const delta = (targetMod - currentMod + 360) % 360

    spinDuration.value = spin.durationMs
    wheelRotation.value += 360 * 5 + delta
  }
)

const wheelStyle = computed(() => {
  const segments = props.view.segments
  const step = 360 / Math.max(1, segments.length)
  const stops = segments
    .map((_, index) => {
      const start = (index * step).toFixed(2)
      const end = ((index + 1) * step).toFixed(2)
      return 'var(' + paletteVar(index) + ') ' + start + 'deg ' + end + 'deg'
    })
    .join(', ')
  return {
    background: 'conic-gradient(' + stops + ')',
    transform: 'rotate(' + wheelRotation.value + 'deg)',
    transitionDuration: spinDuration.value + 'ms'
  }
})

function paletteVar(index: number): string {
  const palette = ['--accent', '--info', '--bilibili', '--surface-active', '--success', '--warning', '--accent-strong']
  return palette[index % palette.length] ?? '--surface-active'
}

async function spin(): Promise<void> {
  if (props.view.segments.length < 2) {
    showToast('转盘至少需要两个格子', 'error')
    return
  }
  await actions.toolAction('wheel', { type: 'spin' })
}

async function preview(): Promise<void> {
  await actions.toolAction('wheel', { type: 'preview' })
}

async function saveSegments(): Promise<void> {
  const segments = segmentsText.value
    .split(/[\n,，]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  if (segments.length < 2) {
    showToast('至少保留两个格子', 'error')
    return
  }
  if (segments.length > 16) {
    showToast('最多 16 个格子，已截断', 'info')
  }

  const next = segments.slice(0, 16)
  segmentsText.value = next.join('\n')
  const ok = await actions.updateToolConfig('wheel', { segments: next })
  if (ok) showToast('转盘内容已保存', 'success')
}

async function saveDuration(): Promise<void> {
  const raw = Number(duration.value)
  const next = Number.isFinite(raw)
    ? Math.min(10, Math.max(2, Math.round(raw)))
    : props.view.config.spinDurationSeconds
  duration.value = next
  await actions.updateToolConfig('wheel', { spinDurationSeconds: next })
}

async function clearHistory(): Promise<void> {
  await actions.toolAction('wheel', { type: 'clear-history' })
}
</script>

<template>
  <section class="card wheel-card">
    <header class="card-head">
      <div class="title">
        <span class="glyph"><AppIcon name="wheel" :size="20" /></span>
        <div>
          <h2>转转盘</h2>
          <p>主播手动触发，不需要弹幕命令</p>
        </div>
      </div>
      <span class="phase" :class="'phase-' + view.phase">{{ phaseText }}</span>
    </header>

    <div class="card-body">
      <div class="left">
        <div class="wheel-frame">
          <div class="wheel-disc" :style="wheelStyle" />
          <span class="hub">1017</span>
          <span class="pointer" />
        </div>
        <div class="preview-meta">
          <span>{{ view.segments.length }} 格</span>
          <span>{{ duration }} 秒</span>
        </div>
        <div class="actions">
          <button class="btn primary" :disabled="spinning" @click="spin">
            <AppIcon name="play" :size="15" />
            开始旋转
          </button>
          <button class="btn ghost" :disabled="spinning" @click="preview">
            <AppIcon name="eye" :size="15" />
            预览
          </button>
        </div>
        <p class="hint">没有命令、没有倒计时。主播点一下，转盘就在这里旋转；停稳后再弹结果。</p>
      </div>

      <div class="right">
        <div class="last-result">
          <span>最近结果</span>
          <strong v-if="displayedResult" :class="{ pending: spinning }">{{ displayedResult }}</strong>
          <em v-else>还没有旋转</em>
        </div>

        <label class="field">
          <span>格子内容（每行一个，2–16 个）</span>
          <textarea v-model="segmentsText" rows="6" spellcheck="false" />
        </label>

        <div class="inline-fields">
          <label>
            <span>旋转时长</span>
            <div class="unit">
              <input v-model.number="duration" type="number" min="2" max="10" @change="saveDuration" />
              <em>秒</em>
            </div>
          </label>
          <button class="btn secondary save" @click="saveSegments">保存转盘</button>
        </div>

        <div class="history">
          <div class="history-head">
            <span>历史</span>
            <button v-if="view.history.length > 0" @click="clearHistory">清空</button>
          </div>
          <ul v-if="view.history.length > 0">
            <li v-for="item in view.history.slice(0, 5)" :key="item.spinId">
              <span>{{ item.label }}</span>
              <time class="mono">{{ formatTime(item.at) }}</time>
            </li>
          </ul>
          <p v-else class="history-empty">旋转一次，结果会留在这里。</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-5);
  border-bottom: 1px solid var(--hairline);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.glyph {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--accent);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.title p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.phase {
  padding: 4px 10px;
  border-radius: var(--r-chip);
  background: var(--surface-active);
  color: var(--mute);
  font-size: 11px;
  white-space: nowrap;
}

.phase-spinning {
  color: var(--accent);
  background: var(--accent-soft);
}

.phase-result {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}

.card-body {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(300px, 1.1fr);
  gap: var(--s-5);
  padding: var(--s-5);
}

.left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  padding-right: var(--s-5);
  border-right: 1px solid var(--hairline);
}

.wheel-frame {
  position: relative;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--hairline-strong), var(--glow-accent);
}

.wheel-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.7, 0.15, 1);
}

.hub {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: var(--canvas);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  transform: translate(-50%, -50%);
}

.pointer {
  position: absolute;
  top: -12px;
  left: 50%;
  z-index: 2;
  width: 0;
  height: 0;
  border-right: 9px solid transparent;
  border-left: 9px solid transparent;
  border-top: 18px solid var(--accent);
  transform: translateX(-50%);
}

.preview-meta {
  display: flex;
  gap: var(--s-3);
  color: var(--mute);
  font-family: var(--font-mono);
  font-size: 11px;
}

.actions {
  display: flex;
  gap: var(--s-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  height: 36px;
  padding: 0 var(--s-4);
  border-radius: var(--r-control);
  font-size: 13px;
  font-weight: 600;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.primary {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.primary:hover {
  background: var(--accent-strong);
}

.ghost {
  border: 1px solid transparent;
  background: transparent;
  color: var(--mute);
}

.ghost:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.secondary {
  border: 1px solid var(--hairline-strong);
  background: transparent;
  color: var(--body);
}

.secondary:hover {
  background: var(--surface-hover);
}

.hint {
  max-width: 260px;
  margin: 0;
  color: var(--mute);
  font-size: 11px;
  line-height: 17px;
  text-align: center;
}

.right {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

.last-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
}

.last-result span {
  color: var(--mute);
  font-size: 10px;
}

.last-result strong {
  color: var(--accent);
  font-size: 24px;
  font-weight: 600;
  line-height: 30px;
}

.last-result strong.pending {
  color: var(--info);
  font-size: 16px;
}

.last-result em {
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 11px;
}

textarea {
  width: 100%;
  min-height: 108px;
  padding: var(--s-2) var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 12px;
  line-height: 20px;
  resize: vertical;
}

.inline-fields {
  display: flex;
  align-items: flex-end;
  gap: var(--s-2);
}

.inline-fields label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 11px;
}

.unit {
  position: relative;
  width: 90px;
}

.unit input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 12px;
}

.unit em {
  position: absolute;
  right: 10px;
  top: 8px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.save {
  margin-left: auto;
  height: 34px;
  font-size: 12px;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.history-head {
  display: flex;
  justify-content: space-between;
  color: var(--mute);
  font-size: 10px;
}

.history-head button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--faint);
  font-size: 10px;
}

.history-head button:hover {
  color: var(--danger);
}

.history ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history li {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  color: var(--body);
  font-size: 11px;
}

.history time {
  color: var(--faint);
  font-size: 10px;
}

.history-empty {
  margin: 0;
  color: var(--faint);
  font-size: 11px;
}

@media (max-width: 1180px) {
  .card-body {
    grid-template-columns: 1fr;
  }

  .left {
    padding-right: 0;
    padding-bottom: var(--s-4);
    border-right: 0;
    border-bottom: 1px solid var(--hairline);
  }
}
</style>
