<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { VoteToolView } from '@contracts/view'
import AppIcon from '../components/AppIcon.vue'
import { actions, showToast } from '../store'

const props = defineProps<{ view: VoteToolView }>()

const question = ref(props.view.config.question)
const optionsText = ref(props.view.config.options.join(String.fromCharCode(10)))
const countdown = ref(props.view.config.countdownSeconds)

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
const winnerLabel = computed(() => {
  const result = props.view.lastResult
  if (result === null) return ''
  if (result.winners.length === 0) return '无人投票'
  return result.winners.map((index) => result.options[index] ?? '').join(' / ')
})
const phaseLabel = computed(() => {
  if (props.view.phase === 'collecting') return '投票中'
  if (props.view.phase === 'result') return '已结束'
  return '待开始'
})

function percent(count: number): number {
  return total.value === 0 ? 0 : (count / total.value) * 100
}

function validate(): boolean {
  if (options.value.length < 2 || options.value.length > 8) {
    showToast('投票需要 2–8 个选项', 'error')
    return false
  }
  if (options.value.some((item) => item.length > 20)) {
    showToast('单个选项最多 20 个字', 'error')
    return false
  }
  const seen = new Set<string>()
  for (const option of options.value) {
    const key = option.toLocaleLowerCase()
    if (seen.has(key)) {
      showToast('投票选项不能重复', 'error')
      return false
    }
    seen.add(key)
  }
  const seconds = Math.round(Number(countdown.value))
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 300) {
    showToast('倒计时需在 5–300 秒之间', 'error')
    return false
  }
  return true
}

async function save(): Promise<boolean> {
  if (!validate()) return false
  const ok = await actions.updateToolConfig('vote', {
    question: question.value.trim(),
    options: options.value,
    countdownSeconds: Math.round(Number(countdown.value)),
    commandAliases: [...props.view.config.commandAliases]
  })
  if (ok) showToast('投票配置已保存', 'success')
  return ok
}

async function start(): Promise<void> {
  if (!(await save())) return
  await actions.toolAction('vote', { type: 'start' })
}

async function end(): Promise<void> {
  await actions.toolAction('vote', { type: 'end' })
}

async function cancel(): Promise<void> {
  await actions.toolAction('vote', { type: 'cancel' })
}

async function preview(): Promise<void> {
  await actions.toolAction('vote', { type: 'preview' })
}

async function sendHint(index: number): Promise<void> {
  const alias = props.view.config.commandAliases[0] ?? '投票'
  await actions.simulateChat('测试观众', '!' + alias + ' ' + String(index))
}
</script>

<template>
  <section class="card">
    <header>
      <div class="title">
        <span class="icon"><AppIcon name="vote" :size="20" /></span>
        <div>
          <h2>弹幕投票</h2>
          <p>观众发「投票 1」或选项文字；同一观众以最后一票为准。</p>
        </div>
      </div>
      <span class="phase" :class="view.phase">{{ phaseLabel }}</span>
    </header>

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
          <button class="btn secondary" :disabled="locked" @click="save">保存配置</button>
        </div>

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

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--s-3);
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
  padding: 3px 8px;
  border-radius: var(--r-chip);
  background: var(--surface-active);
  color: var(--mute);
  font-size: 10px;
  white-space: nowrap;
}

.phase.collecting {
  color: var(--info);
}

.phase.result {
  color: var(--success);
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
