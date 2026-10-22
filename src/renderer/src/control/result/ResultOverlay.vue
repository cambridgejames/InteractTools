<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type {
  DiceResultPresentation,
  VoteResultPresentation,
  WheelResultPresentation
} from '@contracts/presentation'
import AppIcon from '../components/AppIcon.vue'
import { burstConfetti } from './confetti'
import { facesLabel, formatPower, methodLabel } from '../../shared/format'

const props = defineProps<{
  result: DiceResultPresentation | WheelResultPresentation | VoteResultPresentation
}>()
const emit = defineEmits<{ close: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const dice = computed(() => (props.result.toolId === 'dice' ? props.result : null))
const wheel = computed(() => (props.result.toolId === 'wheel' ? props.result : null))
const vote = computed(() => (props.result.toolId === 'vote' ? props.result : null))
const voteMax = computed(() => (vote.value === null ? 1 : Math.max(1, ...vote.value.counts)))
const voteLabel = computed(() => {
  if (vote.value === null) return ''
  if (vote.value.winners.length === 0) return '无人投票'
  return vote.value.winners.map((index) => vote.value?.options[index] ?? '').join(' / ')
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (canvas.value !== null) burstConfetti(canvas.value)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <div class="result-pop" role="dialog" aria-modal="true" @click.self="emit('close')">
    <canvas ref="canvas" class="confetti" />
    <section class="result-card">
      <button class="result-close" aria-label="关闭结果" @click="emit('close')">
        <AppIcon name="close" :size="16" />
      </button>

      <template v-if="dice">
        <span class="eyebrow">{{ facesLabel(dice.faces) }} / {{ dice.power }} 力度</span>
        <div class="value-row">
          <strong>{{ dice.value }}</strong>
          <span>点</span>
        </div>
        <p v-if="!dice.settled" class="warn">骰子尚未完全停稳，已取最近一面</p>
        <div class="stats">
          <div><span>参与</span><strong>{{ dice.stats.count }}</strong><em>人</em></div>
          <div><span>力度</span><strong>{{ formatPower(dice.power) }}</strong></div>
          <div><span>聚合</span><strong>{{ methodLabel(dice.stats.method) }}</strong></div>
        </div>
        <div class="power-meter">
          <div class="power-head">
            <span>抛投力度</span>
            <strong>{{ formatPower(dice.power) }}<em>/100</em></strong>
          </div>
          <div class="power-track"><i :style="{ width: dice.power + '%' }" /></div>
          <p>力度越高，骰子抛得越猛；最终点数仍由物理碰撞决定。</p>
        </div>
      </template>

      <template v-else-if="wheel">
        <span class="eyebrow">转转盘 / {{ wheel.segments.length }} 格</span>
        <strong class="wheel-label">{{ wheel.label }}</strong>
        <p class="sub">第 {{ wheel.index + 1 }} 格 · 主播手动触发</p>
      </template>

      <template v-else-if="vote">
        <span class="eyebrow">弹幕投票 / {{ vote.options.length }} 项 · {{ vote.totalVotes }} 票</span>
        <p class="vote-question">{{ vote.question || '本轮投票' }}</p>
        <strong class="wheel-label vote-label">{{ voteLabel }}</strong>
        <div class="tally">
          <div v-for="(option, index) in vote.options" :key="option" class="tally-row">
            <span class="tally-name" :class="{ winner: vote.winners.includes(index) }">
              {{ option }}
            </span>
            <span class="tally-bar">
              <i :style="{ width: ((vote.counts[index] ?? 0) / voteMax) * 100 + '%' }" />
            </span>
            <span class="tally-count">{{ vote.counts[index] ?? 0 }}</span>
          </div>
        </div>
      </template>

      <button class="result-ok" @click="emit('close')">知道了</button>
    </section>
  </div>
</template>
