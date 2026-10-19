<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { VoteConfig } from '@contracts/vote'
import type { VoteToolView } from '@contracts/view'
import PresetManager from './PresetManager.vue'
import ToolHeader from './ToolHeader.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { actions, showToast } from '../store'

type VotePreset = VoteConfig['presets'][number]

const props = defineProps<{ view: VoteToolView }>()

const question = ref(props.view.config.question)
const optionsText = ref(props.view.config.options.join(String.fromCharCode(10)))
const countdown = ref(props.view.config.countdownSeconds)
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  if (ticker !== null) clearInterval(ticker)
  if (saveTimer !== null) clearTimeout(saveTimer)
})

watch(
  () => props.view.config.question,
  (value) => {
    question.value = value
  }
)

watch(
  () => props.view.config.options,
  (value) => {
    optionsText.value = value.join(String.fromCharCode(10))
  }
)

watch(
  () => props.view.config.countdownSeconds,
  (value) => {
    countdown.value = value
  }
)

const locked = computed(() => props.view.phase === 'collecting')
const options = computed(() =>
  optionsText.value
    .split(String.fromCharCode(10))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
)
const total = computed(() => props.view.totalVotes)
const remainingSeconds = computed(() => {
  const endsAt = props.view.countdownEndsAt
  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now.value) / 1000))
})
const countdownProgress = computed(() => {
  const total = props.view.config.countdownSeconds
  if (total <= 0 || props.view.countdownEndsAt === null) return 0
  return Math.min(100, Math.max(0, (remainingSeconds.value / total) * 100))
})
const winnerLabel = computed(() => {
  const result = props.view.lastResult
  if (result === null) return ''
  if (result.winners.length === 0) return '无人投票'
  return result.winners.map((index) => result.options[index] ?? '').join(' / ')
})
const presetRows = computed(() =>
  props.view.config.presets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    meta: String(preset.options.length) + ' 项 · ' + String(preset.countdownSeconds) + ' 秒'
  }))
)

const voteRule = computed(() =>
  props.view.config.allowRevote ? '同一观众以最后一票为准。' : '同一观众只计第一票。'
)

const phaseLabel = computed(() => {
  if (props.view.phase === 'collecting') return '投票中'
  if (props.view.phase === 'result') return '已结束'
  return '待开始'
})

function percent(count: number): number {
  return total.value === 0 ? 0 : (count / total.value) * 100
}

function validate(showError: boolean): boolean {
  if (options.value.length < 2 || options.value.length > 8) {
    if (showError) showToast('投票需要 2–8 个选项', 'error')
    return false
  }
  if (options.value.some((item) => item.length > 20)) {
    if (showError) showToast('单个选项最多 20 个字', 'error')
    return false
  }
  const seen = new Set<string>()
  for (const option of options.value) {
    const key = option.toLocaleLowerCase()
    if (seen.has(key)) {
      if (showError) showToast('投票选项不能重复', 'error')
      return false
    }
    seen.add(key)
  }
  const seconds = Math.round(Number(countdown.value))
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 300) {
    if (showError) showToast('倒计时需在 5–300 秒之间', 'error')
    return false
  }
  return true
}

async function persist(showError: boolean): Promise<boolean> {
  if (!validate(showError)) return false
  return actions.updateToolConfig('vote', {
    question: question.value.trim(),
    options: options.value,
    countdownSeconds: Math.round(Number(countdown.value)),
    commandAliases: [...props.view.config.commandAliases]
  })
}

function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persist(false)
  }, 500)
}

watch([question, optionsText, countdown], () => scheduleSave())

async function savePreset(name: string): Promise<void> {
  if (!(await persist(true))) return
  if (name.length === 0) {
    showToast('先给预设起个名字', 'error')
    return
  }

  const existing = props.view.config.presets.find((preset) => preset.name === name)
  if (existing === undefined && props.view.config.presets.length >= 12) {
    showToast('最多保存 12 个预设', 'error')
    return
  }

  const preset: VotePreset = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    question: question.value.trim(),
    options: options.value,
    countdownSeconds: Math.round(Number(countdown.value)),
    allowRevote: props.view.config.allowRevote
  }
  const presets = existing === undefined
    ? [...props.view.config.presets, preset]
    : props.view.config.presets.map((item) => (item.id === existing.id ? preset : item))
  const ok = await actions.updateToolConfig('vote', { presets })
  if (ok) showToast('预设已保存', 'success')
}

async function applyPreset(id: string): Promise<void> {
  if (locked.value) return
  const preset = props.view.config.presets.find((item) => item.id === id)
  if (preset === undefined) return
  question.value = preset.question
  optionsText.value = preset.options.join(String.fromCharCode(10))
  countdown.value = preset.countdownSeconds
  const ok = await actions.updateToolConfig('vote', {
    question: preset.question,
    options: preset.options,
    countdownSeconds: preset.countdownSeconds,
    allowRevote: preset.allowRevote
  })
  if (ok) showToast('已载入「' + preset.name + '」', 'success')
}

async function setAllowRevote(value: boolean): Promise<void> {
  await actions.updateToolConfig('vote', { allowRevote: value })
}

async function removePreset(id: string): Promise<void> {
  const presets = props.view.config.presets.filter((preset) => preset.id !== id)
  await actions.updateToolConfig('vote', { presets })
}

async function start(): Promise<void> {
  if (!(await persist(true))) return
  await actions.toolAction('vote', { type: 'start' })
}

async function end(): Promise<void> {
  await actions.toolAction('vote', { type: 'end' })
}

async function cancel(): Promise<void> {
  await actions.toolAction('vote', { type: 'cancel' })
}

async function preview(): Promise<void> {
  if (!(await persist(true))) return
  await actions.toolAction('vote', { type: 'preview' })
}

async function sendHint(index: number): Promise<void> {
  const alias = props.view.config.commandAliases[0] ?? '投票'
  await actions.simulateChat('测试观众', '!' + alias + ' ' + String(index))
}
</script>

<template>
  <section class="card">
    <ToolHeader
      icon="vote"
      title="弹幕投票"
      :description="'观众发「投票 1」或选项文字；' + voteRule"
      :phase-text="phaseLabel"
      :tone="view.phase === 'result' ? 'done' : locked ? 'active' : 'idle'"
    />

    <div class="command-hints">
      <span class="hint-label">测试命令</span>
      <button
        v-for="index in view.options.length"
        :key="index"
        type="button"
        class="hint-chip"
        :disabled="!locked"
        @click="sendHint(index)"
      >
        !{{ view.config.commandAliases[0] ?? '投票' }} {{ index }}
      </button>
      <span class="hint-note">投票中才会被计数</span>
    </div>

    <div class="body">
      <div class="live">
        <div v-if="view.phase === 'collecting'" class="countdown-hero">
          <div class="countdown-line">
            <strong>{{ remainingSeconds }}</strong>
            <span>秒后结束</span>
          </div>
          <div class="countdown-track">
            <i :style="{ width: countdownProgress + '%' }" />
          </div>
        </div>
        <p class="question">{{ view.question || '本轮投票' }}</p>
        <ul class="options">
          <li
            v-for="(option, index) in view.options"
            :key="option"
            :class="{ winner: view.phase === 'result' && view.lastResult?.winners.includes(index) }"
          >
            <div class="option-head">
              <span class="option-name">{{ option }}</span>
              <span class="option-count">{{ view.counts[index] ?? 0 }} 票</span>
            </div>
            <div class="option-bar">
              <i :style="{ width: percent(view.counts[index] ?? 0) + '%' }" />
            </div>
          </li>
        </ul>
        <div class="meta">
          <span>共 {{ total }} 票</span>
          <span v-if="view.phase === 'result'" class="winner-text">胜出：{{ winnerLabel }}</span>
          <span v-else-if="view.phase === 'collecting'">发送「投票 1」或选项文字</span>
          <span v-else>等待开始</span>
        </div>
      </div>

      <aside class="editor">
        <label class="field">
          <span>问题</span>
          <input v-model="question" maxlength="80" :disabled="locked" placeholder="例如：今晚玩什么？" />
        </label>

        <label class="field">
          <span>选项（每行一个，2–8 项）</span>
          <textarea v-model="optionsText" rows="5" :disabled="locked" />
        </label>

        <div class="inline">
          <label class="field compact">
            <span>倒计时</span>
            <div class="unit">
              <input v-model.number="countdown" type="number" min="5" max="300" :disabled="locked" />
              <em>秒</em>
            </div>
          </label>
          <span class="auto-save">自动保存</span>
        </div>

        <div class="revote-row">
          <div>
            <strong>允许改票</strong>
            <span>关闭时只计第一票；开启后同一观众的后票覆盖前票。</span>
          </div>
          <ToggleSwitch
            :model-value="view.config.allowRevote"
            label="允许改票"
            :disabled="locked"
            @update:model-value="setAllowRevote"
          />
        </div>

        <PresetManager
          :presets="presetRows"
          :disabled="locked"
          placeholder="例如 真心话"
          empty-text="把当前投票存成预设，下次一键载入。"
          @save="savePreset"
          @apply="applyPreset"
          @remove="removePreset"
        />

        <div class="actions">
          <button v-if="view.phase === 'collecting'" class="btn primary" @click="end">提前结束</button>
          <button v-else class="btn primary" @click="start">
            {{ view.phase === 'result' ? '再投一轮' : '开始投票' }}
          </button>
          <button v-if="view.phase === 'collecting'" class="btn secondary" @click="cancel">取消</button>
          <button class="btn ghost" :disabled="locked" @click="preview">预览</button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-5);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.command-hints {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.hint-label {
  color: var(--mute);
  font-size: 10px;
  letter-spacing: 0.8px;
}

.hint-chip {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-chip);
  background: transparent;
  color: var(--body);
  font-family: var(--font-mono);
  font-size: 10px;
}

.hint-chip:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.hint-chip:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hint-note {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}

.auto-save {
  margin-left: auto;
  align-self: center;
  color: var(--faint);
  font-size: 10px;
}

.body {
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(300px, 0.9fr);
  gap: var(--s-5);
}

.live {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding-right: var(--s-5);
  border-right: 1px solid var(--hairline);
}

.countdown-hero {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--hairline));
  border-radius: var(--r-card);
  background: var(--surface-active);
}

.countdown-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.countdown-line strong {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 64px;
  font-weight: 700;
  line-height: 64px;
  letter-spacing: -3px;
  font-variant-numeric: tabular-nums;
  text-shadow: var(--glow-accent);
}

.countdown-line span {
  color: var(--mute);
  font-size: 12px;
}

.countdown-track {
  height: 5px;
  overflow: hidden;
  border-radius: var(--r-chip);
  background: var(--hairline);
}

.countdown-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 200ms linear;
}

.question {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.options li {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}

.option-name {
  overflow: hidden;
  color: var(--body);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.options li.winner .option-name {
  color: var(--accent);
  font-weight: 600;
}

.option-count {
  color: var(--mute);
  font-family: var(--font-mono);
  font-size: 11px;
}

.option-bar {
  height: 6px;
  overflow: hidden;
  border-radius: var(--r-chip);
  background: var(--hairline);
}

.option-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--dur-base) var(--ease-out);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
  color: var(--mute);
  font-size: 11px;
}

.winner-text {
  color: var(--accent);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 11px;
}

.field.compact {
  flex: 0 0 112px;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-family: inherit;
  font-size: 12px;
}

.field input {
  height: 36px;
}

.field textarea {
  padding-top: 9px;
  padding-bottom: 9px;
  resize: vertical;
  line-height: 1.5;
}

.field input:disabled,
.field textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.revote-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
}

.revote-row div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.revote-row strong {
  color: var(--body);
  font-size: 11px;
  font-weight: 600;
}

.revote-row span {
  color: var(--faint);
  font-size: 10px;
  line-height: 15px;
}

.inline {
  display: flex;
  align-items: flex-end;
  gap: var(--s-3);
}

.unit {
  position: relative;
}

.unit input {
  padding-right: 30px;
}

.unit em {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.btn {
  height: 34px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--body);
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.btn.secondary {
  border-color: var(--hairline-strong);
  background: var(--surface-active);
}

.btn.ghost {
  color: var(--mute);
}

.btn.ghost:hover:not(:disabled) {
  color: var(--ink);
}

.btn.primary:hover:not(:disabled) {
  filter: brightness(1.04);
}

@media (max-width: 1180px) {
  .body {
    grid-template-columns: minmax(0, 1fr);
  }

  .live {
    padding-right: 0;
    padding-bottom: var(--s-4);
    border-right: 0;
    border-bottom: 1px solid var(--hairline);
  }
}
</style>
