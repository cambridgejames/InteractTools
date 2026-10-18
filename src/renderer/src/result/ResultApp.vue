<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { DiceResultPresentation, WheelResultPresentation } from '@contracts/presentation'
import AppIcon from '../control/components/AppIcon.vue'
import { burstConfetti } from './confetti'
import { facesLabel, formatPower, methodLabel } from '../shared/format'

type ResultPayload = DiceResultPresentation | WheelResultPresentation

const result = ref<ResultPayload | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let unsubscribe: (() => void) | null = null

const dice = computed(() => (result.value?.toolId === 'dice' ? result.value : null))
const wheel = computed(() => (result.value?.toolId === 'wheel' ? result.value : null))

onMounted(() => {
  unsubscribe = window.resultApi.onPresentation(handleResult)
  window.resultApi.ready()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  unsubscribe?.()
  window.removeEventListener('keydown', handleKeydown)
})

async function handleResult(next: ResultPayload): Promise<void> {
  result.value = next
  await nextTick()
  if (canvas.value !== null) burstConfetti(canvas.value)
}

function close(): void {
  window.resultApi.dismiss()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}
</script>

<template>
  <div v-if="result" class="result-root">
    <canvas ref="canvas" class="confetti" />
    <section class="result-card">
      <button class="result-close" aria-label="关闭结果" @click="close">
        <AppIcon name="close" :size="16" />
      </button>

      <template v-if="dice">
        <span class="eyebrow">{{ facesLabel(dice.faces) }} / {{ dice.power }} 力度</span>
        <div class="value-row">
          <strong>{{ dice.value }}</strong>
          <span>点</span>
        </div>
        <p v-if="!dice.settled" class="warn">未完全停稳，取最近面</p>
        <div class="stats">
          <div><span>参与</span><strong>{{ dice.stats.count }}</strong><em>人</em></div>
          <div><span>力度</span><strong>{{ formatPower(dice.power) }}</strong></div>
          <div><span>聚合</span><strong>{{ methodLabel(dice.stats.method) }}</strong></div>
        </div>
      </template>

      <template v-else-if="wheel">
        <span class="eyebrow">WHEEL / {{ wheel.segments.length }} 格</span>
        <strong class="wheel-label">{{ wheel.label }}</strong>
        <p class="sub">第 {{ wheel.index + 1 }} 格 · 主播手动触发</p>
      </template>

      <button class="result-ok" @click="close">知道了</button>
    </section>
  </div>
</template>
