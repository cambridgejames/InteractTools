<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { WHEEL_LABEL_MAX, type WheelPreset } from '@contracts/wheel'
import type { WheelToolView } from '@contracts/view'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'
import { actions, showToast } from '../store'
import { formatTime } from '../../shared/format'

const props = defineProps<{ view: WheelToolView }>()

const segmentsText = ref(props.view.config.segments.join('\n'))
const duration = ref(props.view.config.spinDurationSeconds)
const presetName = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

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

watch(segmentsText, () => scheduleSegments())
watch(duration, () => scheduleDuration())

onUnmounted(() => {
  if (saveTimer !== null) clearTimeout(saveTimer)
})

function scheduleSegments(): void {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persistSegments(false)
  }, 500)
}

function scheduleDuration(): void {
  const raw = Number(duration.value)
  const next = Number.isFinite(raw)
    ? Math.min(10, Math.max(2, Math.round(raw)))
    : props.view.config.spinDurationSeconds
  if (next === props.view.config.spinDurationSeconds) return
  void actions.updateToolConfig('wheel', { spinDurationSeconds: next })
}

function readSegments(): string[] {
  return segmentsText.value
    .split(/[\n,，]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
}

function readDuration(): number {
  const raw = Number(duration.value)
  return Number.isFinite(raw)
    ? Math.min(10, Math.max(2, Math.round(raw)))
    : props.view.config.spinDurationSeconds
}

async function persistSegments(showError: boolean): Promise<boolean> {
  const segments = readSegments()

  if (segments.length < 2) {
    if (showError) showToast('至少保留两个格子', 'error')
    return false
  }

  let next = segments.slice(0, 16)
  const truncated = next.some((segment) => Array.from(segment).length > WHEEL_LABEL_MAX)
  if (truncated) {
    next = next.map((segment) => Array.from(segment).slice(0, WHEEL_LABEL_MAX).join(''))
    showToast('单个格子最多 ' + String(WHEEL_LABEL_MAX) + ' 字，已截断', 'info')
  }
  if (segments.length > 16 && showError) showToast('最多 16 个格子，已截断', 'info')
  if (next.length !== segments.length || truncated) segmentsText.value = next.join('\n')
  return actions.updateToolConfig('wheel', { segments: next })
}

async function savePreset(): Promise<void> {
  if (!(await persistSegments(true))) return
  const name = presetName.value.trim()
  if (name.length === 0) {
    showToast('先给预设起个名字', 'error')
    return
  }

  const segments = readSegments().slice(0, 16)
  const existing = props.view.config.presets.find((preset) => preset.name === name)
  if (existing === undefined && props.view.config.presets.length >= 12) {
    showToast('最多保存 12 个预设', 'error')
    return
  }

  const preset: WheelPreset = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    segments,
    spinDurationSeconds: readDuration()
  }
  const presets = existing === undefined
    ? [...props.view.config.presets, preset]
    : props.view.config.presets.map((item) => (item.id === existing.id ? preset : item))
  const ok = await actions.updateToolConfig('wheel', { presets })
  if (ok) {
    presetName.value = ''
    showToast('预设已保存', 'success')
  }
}

async function applyPreset(preset: WheelPreset): Promise<void> {
  if (spinning.value) return
  segmentsText.value = preset.segments.join('\n')
  duration.value = preset.spinDurationSeconds
  const ok = await actions.updateToolConfig('wheel', {
    segments: preset.segments,
    spinDurationSeconds: preset.spinDurationSeconds
  })
  if (ok) showToast('已载入「' + preset.name + '」', 'success')
}

async function removePreset(id: string): Promise<void> {
  const presets = props.view.config.presets.filter((preset) => preset.id !== id)
  await actions.updateToolConfig('wheel', { presets })
}

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

function maxLabelFont(count: number): number {
  if (count <= 4) return 22
  if (count <= 6) return 20
  if (count <= 8) return 18
  if (count <= 10) return 16
  if (count <= 12) return 14
  return 12
}

function labelStyle(index: number): Record<string, string> {
  const count = props.view.segments.length
  const label = props.view.segments[index] ?? ''
  const step = 360 / Math.max(1, count)
  const angle = (index + 0.5) * step
  const radians = ((angle - 90) * Math.PI) / 180
  const radius = count <= 4 ? 116 : 128
  const width = count <= 4 ? 130 : count <= 6 ? 118 : count <= 8 ? 96 : count <= 10 ? 80 : 64
  const chars = Array.from(label).length
  // 两行容量近似：字宽 × 字号 × 2 ≈ width × 2；短词封顶，长词缩字号。
  const fit = (width * 2) / Math.max(1, chars)
  const fontSize = Math.max(9, Math.min(maxLabelFont(count), fit))

  return {
    left: 'calc(50% + ' + Math.cos(radians) * radius + 'px)',
    top: 'calc(50% + ' + Math.sin(radians) * radius + 'px)',
    // 沿半径排布，文字跟着扇形一起转；超过半圈时翻转，减少倒着读。
    transform: 'translate(-50%, -50%) rotate(' + (angle - 90 + (angle > 180 ? 180 : 0)) + 'deg)',
    color: index % 7 === 3 ? 'var(--ink)' : 'var(--canvas)',
    width: width + 'px',
    fontSize: fontSize.toFixed(1) + 'px'
  }
}

async function spin(): Promise<void> {
  if (!(await persistSegments(true))) return
  await actions.toolAction('wheel', { type: 'spin' })
}

async function preview(): Promise<void> {
  if (!(await persistSegments(true))) return
  await actions.toolAction('wheel', { type: 'preview' })
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
          <div class="wheel-disc" :style="wheelStyle">
            <span
              v-for="(segment, index) in view.segments"
              :key="index"
              class="wheel-label"
              :style="labelStyle(index)"
              :title="segment"
            >
              {{ segment }}
            </span>
          </div>
          <span class="hub">
            <BrandMark :size="46" />
            <span class="hub-pointer" />
          </span>
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
          <span>格子内容（每行一个，2–16 个，每格最多 {{ WHEEL_LABEL_MAX }} 字）</span>
          <textarea v-model="segmentsText" rows="6" spellcheck="false" @blur="persistSegments(true)" />
        </label>

        <div class="inline-fields">
          <label>
            <span>旋转时长</span>
            <div class="unit">
              <input v-model.number="duration" type="number" min="2" max="10" />
              <em>秒</em>
            </div>
          </label>
          <span class="auto-save">自动保存</span>
        </div>

        <div class="presets">
          <div class="preset-head">
            <span>预设</span>
            <span>保存当前配置</span>
          </div>
          <div class="preset-save">
            <input
              v-model="presetName"
              maxlength="20"
              placeholder="例如 真心话"
              :disabled="spinning"
              @keyup.enter="savePreset"
            />
            <button class="preset-add" :disabled="spinning" @click="savePreset">保存</button>
          </div>
          <div v-if="view.config.presets.length > 0" class="preset-list">
            <div v-for="preset in view.config.presets" :key="preset.id" class="preset-row">
              <button class="preset-apply" :disabled="spinning" @click="applyPreset(preset)">
                <strong>{{ preset.name }}</strong>
                <small>{{ preset.segments.length }} 格 · {{ preset.spinDurationSeconds }} 秒</small>
              </button>
              <button
                class="preset-remove"
                :aria-label="'删除预设 ' + preset.name"
                @click="removePreset(preset.id)"
              >
                ×
              </button>
            </div>
          </div>
          <p v-else class="preset-empty">把当前转盘存成预设，下次一键载入。</p>
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
  grid-template-columns: minmax(440px, 1.1fr) minmax(280px, 0.9fr);
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
  width: 400px;
  height: 400px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--hairline-strong), var(--glow-accent);
}

.wheel-disc {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 50%;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.7, 0.15, 1);
}

.wheel-label {
  position: absolute;
  display: -webkit-box;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hub {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 100px;
  height: 100px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: var(--canvas);
  color: var(--accent);
  transform: translate(-50%, -50%);
}

.hub-pointer {
  position: absolute;
  top: -16px;
  left: 50%;
  width: 0;
  height: 0;
  border-right: 10px solid transparent;
  border-bottom: 18px solid var(--accent);
  border-left: 10px solid transparent;
  filter: drop-shadow(0 0 1px var(--canvas)) drop-shadow(0 3px 6px var(--canvas));
  transform: translateX(-50%);
  z-index: 3;
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

.auto-save {
  margin-left: auto;
  align-self: flex-end;
  color: var(--faint);
  font-size: 10px;
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

.presets {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.preset-head {
  display: flex;
  justify-content: space-between;
  color: var(--mute);
  font-size: 10px;
}

.preset-save {
  display: flex;
  gap: var(--s-2);
}

.preset-save input {
  min-width: 0;
  flex: 1;
  height: 32px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 11px;
}

.preset-add,
.preset-remove {
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--surface-active);
  color: var(--body);
  font-size: 11px;
}

.preset-add {
  padding: 0 var(--s-3);
}

.preset-add:hover:not(:disabled),
.preset-remove:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.preset-add:disabled,
.preset-apply:disabled {
  opacity: 0.5;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-row {
  display: flex;
  gap: 4px;
}

.preset-apply {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-2);
  min-width: 0;
  padding: 6px var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  text-align: left;
}

.preset-apply:hover:not(:disabled) {
  border-color: var(--accent);
}

.preset-apply strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-apply small {
  flex: none;
  color: var(--faint);
  font-size: 9px;
}

.preset-remove {
  width: 30px;
  flex: none;
  padding: 0;
  font-size: 14px;
}

.preset-empty {
  margin: 0;
  color: var(--faint);
  font-size: 10px;
  line-height: 15px;
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

@media (max-width: 1400px) {
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
