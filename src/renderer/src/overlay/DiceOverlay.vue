<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { DiceRollPresentation } from '@contracts/presentation'
import { burstConfetti } from './confetti'
import { DiceScene } from './dice-scene'
import { formatPower, methodLabel } from '../shared/format'

const props = defineProps<{ payload: DiceRollPresentation }>()
const emit = defineEmits<{ finished: [] }>()

const showResult = ref(false)
const stage = ref<HTMLElement | null>(null)
const confetti = ref<HTMLCanvasElement | null>(null)

let scene: DiceScene | null = null

onMounted(() => {
  if (stage.value !== null) {
    scene = new DiceScene(stage.value, handleFinished)
    scene.play(props.payload)
  }
})

onUnmounted(() => {
  scene?.dispose()
  scene = null
})

function handleFinished(): void {
  showResult.value = true
  if (confetti.value !== null) burstConfetti(confetti.value)
  emit('finished')
}
</script>

<template>
  <div class="stage-card">
    <div class="stage">
      <div ref="stage" class="stage-host" />
      <canvas ref="confetti" class="confetti" />
    </div>

    <aside class="info">
      <span class="eyebrow">DICE / D{{ payload.faces }}</span>

      <div class="result">
        <span v-if="!showResult" class="pending">投掷中<span class="dots">…</span></span>
        <template v-else>
          <span class="value">{{ payload.value }}</span>
          <span class="unit">点</span>
        </template>
      </div>

      <p v-if="showResult && !payload.settled" class="settled">未完全停稳，取最近面</p>

      <div class="stats">
        <div>
          <span>参与</span>
          <strong>{{ payload.stats.count }}</strong>
          <em>人</em>
        </div>
        <div>
          <span>力度</span>
          <strong>{{ formatPower(payload.power) }}</strong>
        </div>
        <div>
          <span>聚合</span>
          <strong>{{ methodLabel(payload.stats.method) }}</strong>
        </div>
      </div>

      <div class="power">
        <div class="power-head">
          <span>力度</span>
          <span class="mono">{{ formatPower(payload.power) }} / 100</span>
        </div>
        <div class="bar"><i :style="{ width: Math.min(100, Math.max(0, payload.power)) + '%' }" /></div>
      </div>

      <div class="foot">
        <div class="foot-text">
          <span v-if="!showResult">物理模拟中</span>
          <span v-else>{{ payload.settled ? '物理模拟完成' : '物理模拟完成（近似）' }}</span>
          <span v-if="showResult && payload.autoCloseSeconds > 0">结果窗口将自动关闭</span>
        </div>
        <div v-if="showResult && payload.autoCloseSeconds > 0" class="progress">
          <i :style="{ animationDuration: payload.autoCloseSeconds + 's' }" />
        </div>
      </div>
    </aside>
  </div>
</template>
