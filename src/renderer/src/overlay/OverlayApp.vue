<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { DiceRollPresentation, Presentation } from '@contracts/presentation'
import { burstConfetti } from './confetti'
import { DiceScene } from './dice-scene'
import { formatPower, methodLabel } from '../shared/format'

const payload = ref<DiceRollPresentation | null>(null)
const showResult = ref(false)
const stage = ref<HTMLElement | null>(null)
const confetti = ref<HTMLCanvasElement | null>(null)

let scene: DiceScene | null = null
let unsubscribe: (() => void) | null = null
let dismissTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  unsubscribe = window.overlayApi.onPresentation(handlePresentation)
  window.overlayApi.ready()
})

onUnmounted(() => {
  unsubscribe?.()
  scene?.dispose()
  clearDismiss()
})

function handlePresentation(presentation: Presentation): void {
  if (presentation.kind !== 'dice.roll') return
  void start(presentation.payload)
}

async function start(next: DiceRollPresentation): Promise<void> {
  clearDismiss()
  showResult.value = false
  payload.value = next

  // 舞台 DOM 由 v-if 控制，必须等它挂载后再创建 WebGL。
  await nextTick()
  if (scene === null && stage.value !== null) {
    scene = new DiceScene(stage.value, handleFinished)
  }
  scene?.play(next)
}

function handleFinished(): void {
  if (payload.value === null) return
  showResult.value = true
  if (confetti.value !== null) burstConfetti(confetti.value)
  scheduleDismiss()
}

function scheduleDismiss(): void {
  const current = payload.value
  if (current === null || current.autoCloseSeconds <= 0) return
  clearDismiss()
  dismissTimer = setTimeout(() => {
    window.overlayApi.dismiss()
  }, current.autoCloseSeconds * 1000)
}

function clearDismiss(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}
</script>

<template>
  <div class="overlay-root" :class="{ visible: payload !== null }">
    <div v-if="payload" class="stage-card">
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
  </div>
</template>
