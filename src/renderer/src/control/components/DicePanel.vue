<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { AGGREGATIONS, DICE_FACES, type Aggregation, type DiceFaces } from '@contracts/dice'
import type { DiceToolView } from '@contracts/view'
import AppIcon from './AppIcon.vue'
import CountdownRing from './CountdownRing.vue'
import { actions, state } from '../store'
import { DiceScene } from '../result/dice-scene'
import { formatPower, methodLabel, phaseLabel } from '../../shared/format'

const props = defineProps<{ view: DiceToolView }>()

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
const countdown = ref(props.view.config.countdownSeconds)
const diceStage = ref<HTMLElement | null>(null)
let diceScene: DiceScene | null = null

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

let mountedRollId: string | null = null

watch(
  [() => props.view.phase, () => state.diceRoll?.rollId],
  async () => {
    if (props.view.phase !== 'rolling' || state.diceRoll === null) {
      diceScene?.dispose()
      diceScene = null
      mountedRollId = null
      return
    }

    await nextTick()
    mountDiceScene()
  }
)

function mountDiceScene(): void {
  const roll = state.diceRoll
  if (props.view.phase !== 'rolling' || roll === null || diceStage.value === null) return
  if (diceScene !== null && mountedRollId === roll.rollId) return

  diceScene?.dispose()
  diceScene = new DiceScene(diceStage.value, () => undefined)
  mountedRollId = roll.rollId
  diceScene.play(roll)
}

onUnmounted(() => {
  if (ticker !== null) clearInterval(ticker)
  diceScene?.dispose()
  diceScene = null
  mountedRollId = null
})

watch(
  () => props.view.config.countdownSeconds,
  (value) => {
    countdown.value = value
  }
)

const collecting = computed(() => props.view.phase === 'collecting')
const rolling = computed(() => props.view.phase === 'rolling')
const locked = computed(() => collecting.value || rolling.value)
const remaining = computed(() => {
  const endsAt = props.view.countdownEndsAt
  return endsAt === null ? 0 : Math.max(0, (endsAt - now.value) / 1000)
})
const participants = computed(() => props.view.participants)
const power = computed(() => props.view.summary?.value ?? null)
const resultValue = computed(() => props.view.lastResult?.value ?? null)
const startLabel = computed(() => (props.view.phase === 'result' ? '再投一次' : '开始收集'))

function isDiceFaces(value: number): value is DiceFaces {
  return (DICE_FACES as readonly number[]).includes(value)
}

function isAggregation(value: string): value is Aggregation {
  return (AGGREGATIONS as readonly string[]).includes(value)
}

function onFaces(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = Number(event.target.value)
  if (isDiceFaces(value)) void actions.updateDiceConfig({ faces: value })
}

function onAggregation(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  if (isAggregation(value)) void actions.updateDiceConfig({ aggregation: value })
}

function onCountdown(): void {
  const next = Math.min(600, Math.max(5, Math.round(countdown.value)))
  countdown.value = next
  if (next !== props.view.config.countdownSeconds) {
    void actions.updateDiceConfig({ countdownSeconds: next })
  }
}

async function start(): Promise<void> {
  if (locked.value) return
  await actions.startDice()
}

async function cancel(): Promise<void> {
  await actions.cancelDice()
}

function preview(): void {
  void actions.previewDice()
}

function barWidth(value: number): string {
  return Math.min(100, Math.max(0, value)) + '%'
}

function participantPower(value: number): string {
  return formatPower(value)
}

</script>

<template>
  <section class="card dice-card">
    <header class="card-head">
      <div class="title">
        <span class="glyph"><AppIcon name="dice" :size="20" /></span>
        <div>
          <h2>投骰子</h2>
          <p>弹幕设置力度，刚体物理决定结果</p>
        </div>
      </div>
      <span class="phase" :class="'phase-' + view.phase">{{ phaseLabel(view.phase) }}</span>
    </header>

    <div class="card-body">
      <div class="left">
        <Transition name="dice-swap" mode="out-in" @after-enter="mountDiceScene">
          <div
            v-if="view.phase === 'rolling' && state.diceRoll"
            key="stage"
            ref="diceStage"
            class="dice-stage"
          />
          <CountdownRing
            v-else
            key="ring"
            :phase="view.phase"
            :remaining="remaining"
            :total="view.config.countdownSeconds"
            :value="resultValue"
            :faces="view.config.faces"
          />
        </Transition>

        <div class="primary-actions">
          <button v-if="!collecting && !rolling" class="btn primary" @click="start">
            <AppIcon name="play" :size="15" />
            {{ startLabel }}
          </button>
          <button v-else class="btn secondary" @click="cancel">
            <AppIcon name="stop" :size="15" />
            取消本轮
          </button>
          <button class="btn ghost" :disabled="locked" @click="preview">
            <AppIcon name="eye" :size="15" />
            预览
          </button>
        </div>

        <div class="config">
          <label>
            <span>骰子</span>
            <select :value="view.config.faces" :disabled="locked" @change="onFaces">
              <option v-for="faces in DICE_FACES" :key="faces" :value="faces">D{{ faces }}</option>
            </select>
          </label>
          <label>
            <span>倒计时</span>
            <div class="unit">
              <input
                v-model.number="countdown"
                type="number"
                min="5"
                max="600"
                :disabled="locked"
                @change="onCountdown"
              />
              <em>秒</em>
            </div>
          </label>
          <label>
            <span>聚合</span>
            <select :value="view.config.aggregation" :disabled="locked" @change="onAggregation">
              <option value="median">中位数</option>
              <option value="mean">平均值</option>
              <option value="trimmedMean">截尾均值</option>
            </select>
          </label>
        </div>
      </div>

      <div class="right">
        <div class="stats">
          <div class="stat">
            <span>参与</span>
            <strong>{{ participants.length }}</strong>
            <em>人</em>
          </div>
          <div class="stat">
            <span>力度</span>
            <strong>{{ power === null ? '—' : formatPower(power) }}</strong>
          </div>
          <div class="stat">
            <span>聚合</span>
            <strong>{{ methodLabel(view.config.aggregation) }}</strong>
          </div>
        </div>

        <p v-if="collecting" class="hint">
          发送 <code>!力度 80</code> 设置力度；同一人只取最后一条。
        </p>
        <p v-else-if="view.lastResult === null" class="hint">观众发得越多，力度越接近真实。</p>
        <p v-else class="hint">上一轮 {{ view.lastResult.value }} 点，{{ methodLabel(view.config.aggregation) }}。</p>

        <div class="participants">
          <div class="section-head">
            <span>本轮力度</span>
            <span class="mono">{{ participants.length }} 条</span>
          </div>

          <div v-if="participants.length === 0" class="empty">
            <span>还没有人设置力度</span>
            <small>开始收集后，弹幕里的 !力度 80 会出现在这里。</small>
          </div>

          <ul v-else class="participant-list">
            <li v-for="person in participants" :key="person.userKey" class="participant">
              <span class="avatar">{{ person.userName.slice(0, 1) }}</span>
              <div class="person">
                <span class="name">{{ person.userName }}</span>
                <span class="track"><i :style="{ width: barWidth(person.power) }" /></span>
              </div>
              <span class="power mono">{{ participantPower(person.power) }}</span>
            </li>
          </ul>
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

.phase-collecting {
  color: var(--accent);
  background: var(--accent-soft);
}

.phase-rolling {
  color: var(--info);
  background: color-mix(in srgb, var(--info) 12%, transparent);
}

.phase-result {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}

.card-body {
  display: grid;
  grid-template-columns: minmax(320px, 1.3fr) minmax(300px, 0.9fr);
  gap: var(--s-2);
  padding: var(--s-5);
}

.left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-4);
  padding-right: var(--s-5);
  border-right: 1px solid var(--hairline);
}

.dice-stage {
  width: 100%;
  max-width: 680px;
  aspect-ratio: 4 / 3;
  height: auto;
  overflow: hidden;
  border-radius: var(--r-card);
  background: var(--canvas);
  box-shadow: inset 0 0 0 1px var(--hairline);
}

.dice-swap-enter-active,
.dice-swap-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}

.dice-swap-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.dice-swap-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

.primary-actions {
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

.secondary {
  border: 1px solid var(--hairline-strong);
  background: transparent;
  color: var(--body);
}

.secondary:hover {
  background: var(--surface-hover);
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

.config {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
  width: 100%;
}

.config label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 11px;
}

.config select,
.config input {
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 12px;
}

.config select:disabled,
.config input:disabled {
  opacity: 0.5;
}

.unit {
  position: relative;
  display: flex;
  align-items: center;
}

.unit input {
  padding-right: 32px;
}

.unit em {
  position: absolute;
  right: 10px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.right {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding-left: var(--s-4);
  min-width: 0;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
}

.stat {
  padding: var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
}

.stat span {
  display: block;
  color: var(--mute);
  font-size: 11px;
}

.stat strong {
  display: inline-block;
  margin-top: 2px;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat em {
  margin-left: 2px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.hint {
  margin: 0;
  color: var(--mute);
  font-size: 12px;
  line-height: 18px;
}

.hint code {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--inset);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
}

.participants {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  min-height: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--mute);
  font-size: 11px;
}

.section-head .mono {
  color: var(--faint);
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--s-4);
  border: 1px dashed var(--hairline-strong);
  border-radius: var(--r-control);
  color: var(--body);
  font-size: 12px;
}

.empty small {
  color: var(--mute);
  font-size: 11px;
}

.participant-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.participant {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 40px;
  padding: 0 var(--s-1);
  border-radius: 8px;
}

.participant:hover {
  background: var(--surface-hover);
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

.person {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.name {
  overflow: hidden;
  color: var(--body);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track {
  display: block;
  width: 100%;
  max-width: 140px;
  height: 4px;
  border-radius: 999px;
  background: var(--hairline);
}

.track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width var(--dur-base) var(--ease-out);
}

.power {
  min-width: 32px;
  color: var(--ink);
  font-size: 13px;
  text-align: right;
}

@media (max-width: 1180px) {
  .card-body {
    grid-template-columns: 1fr;
  }

  .left {
    padding-right: 0;
    padding-bottom: var(--s-5);
    border-right: 0;
    border-bottom: 1px solid var(--hairline);
  }

  .right {
    padding-left: 0;
  }
}
</style>
