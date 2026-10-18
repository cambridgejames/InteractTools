<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { WheelSpinPresentation } from '@contracts/presentation'
import { burstConfetti } from './confetti'

const props = defineProps<{ payload: WheelSpinPresentation }>()
const emit = defineEmits<{ finished: [] }>()

interface SegmentColor {
  readonly bg: string
  readonly fg: string
}

const COLORS: readonly SegmentColor[] = [
  { bg: '#c8ff3d', fg: '#08090b' },
  { bg: '#64d8ff', fg: '#08090b' },
  { bg: '#fb7299', fg: '#08090b' },
  { bg: '#1a1e24', fg: '#f2f4f1' },
  { bg: '#3ddc97', fg: '#08090b' },
  { bg: '#f5b544', fg: '#08090b' },
  { bg: '#8b7cff', fg: '#f2f4f1' },
  { bg: '#e6ddc4', fg: '#08090b' }
]

const wheel = ref<HTMLCanvasElement | null>(null)
const confetti = ref<HTMLCanvasElement | null>(null)
const done = ref(false)
const durationSeconds = computed(() => (props.payload.durationMs / 1000).toFixed(1))

let frame = 0
let rotation = 0
let startedAt = 0

onMounted(() => {
  drawWheel(0)
  window.addEventListener('resize', handleResize)
  startSpin()
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', handleResize)
})

function startSpin(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const duration = reduced ? 400 : props.payload.durationMs
  const segment = (Math.PI * 2) / Math.max(1, props.payload.segments.length)
  const target = Math.PI * 2 * 5 - (props.payload.resultIndex + 0.5) * segment
  startedAt = performance.now()

  const tick = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 4)
    rotation = target * eased
    drawWheel(rotation)

    if (progress < 1) {
      frame = requestAnimationFrame(tick)
      return
    }

    done.value = true
    if (confetti.value !== null) burstConfetti(confetti.value)
    emit('finished')
  }

  frame = requestAnimationFrame(tick)
}

function handleResize(): void {
  drawWheel(rotation)
}

function drawWheel(currentRotation: number): void {
  const canvas = wheel.value
  if (canvas === null) return
  const context = canvas.getContext('2d')
  if (context === null) return

  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return

  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  const centerX = width / 2
  const centerY = height / 2 + 8
  const radius = Math.min(width, height) / 2 - 44
  const segments = props.payload.segments
  const step = (Math.PI * 2) / segments.length

  context.save()
  context.translate(centerX, centerY)

  for (let index = 0; index < segments.length; index += 1) {
    const start = -Math.PI / 2 + index * step + currentRotation
    const end = start + step
    const color = COLORS[index % COLORS.length] ?? COLORS[0]
    if (color === undefined) continue

    context.beginPath()
    context.moveTo(0, 0)
    context.arc(0, 0, radius, start, end)
    context.closePath()
    context.fillStyle = color.bg
    context.fill()
    context.strokeStyle = 'rgba(8, 9, 11, 0.55)'
    context.lineWidth = 2
    context.stroke()

    const label = segments[index] ?? ''
    const middle = -Math.PI / 2 + (index + 0.5) * step + currentRotation
    const labelRadius = radius * 0.62
    const maxLabelWidth = 2 * labelRadius * Math.sin(step / 2) * 0.82

    context.save()
    context.translate(Math.cos(middle) * labelRadius, Math.sin(middle) * labelRadius)
    context.fillStyle = color.fg
    context.font = '600 ' + fontSizeFor(segments.length) + 'px "PingFang SC", "Microsoft YaHei UI", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(fitLabel(context, label, maxLabelWidth), 0, 0)
    context.restore()
  }

  const hub = context.createRadialGradient(0, 0, 4, 0, 0, 48)
  hub.addColorStop(0, '#1a1e24')
  hub.addColorStop(1, '#0b0d10')
  context.beginPath()
  context.arc(0, 0, 46, 0, Math.PI * 2)
  context.fillStyle = hub
  context.fill()
  context.strokeStyle = '#c8ff3d'
  context.lineWidth = 2
  context.stroke()

  context.fillStyle = '#c8ff3d'
  context.font = '700 12px "SF Mono", Consolas, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('1017', 0, 0)
  context.restore()

  context.beginPath()
  context.moveTo(centerX, centerY - radius - 22)
  context.lineTo(centerX - 14, centerY - radius + 8)
  context.lineTo(centerX + 14, centerY - radius + 8)
  context.closePath()
  context.fillStyle = '#c8ff3d'
  context.fill()
}

function fontSizeFor(count: number): number {
  if (count <= 4) return 26
  if (count <= 8) return 20
  return 15
}

function fitLabel(context: CanvasRenderingContext2D, label: string, maxWidth: number): string {
  if (context.measureText(label).width <= maxWidth) return label
  let text = label
  while (text.length > 1 && context.measureText(text + '…').width > maxWidth) {
    text = text.slice(0, -1)
  }
  return text + '…'
}
</script>

<template>
  <div class="stage-card">
    <div class="stage wheel-stage">
      <canvas ref="wheel" class="wheel-canvas" />
      <canvas ref="confetti" class="confetti" />
    </div>

    <aside class="info wheel-info">
      <span class="eyebrow">WHEEL / {{ payload.segments.length }} 格</span>

      <div class="result wheel-result">
        <span v-if="!done" class="pending">旋转中<span class="dots">…</span></span>
        <span v-else class="wheel-value">{{ payload.resultLabel }}</span>
      </div>

      <p class="settled">主播手动触发 · 无弹幕命令</p>

      <div class="stats">
        <div>
          <span>格子</span>
          <strong>{{ payload.segments.length }}</strong>
          <em>格</em>
        </div>
        <div>
          <span>时长</span>
          <strong>{{ durationSeconds }}</strong>
          <em>秒</em>
        </div>
        <div>
          <span>模式</span>
          <strong>手动</strong>
        </div>
      </div>

      <div class="wheel-segments">
        <div class="wheel-segments-head">
          <span>转盘内容</span>
          <span class="mono">{{ payload.segments.length }}</span>
        </div>
        <ul>
          <li v-for="(segment, index) in payload.segments" :key="segment + index">
            <i :style="{ background: (COLORS[index % COLORS.length] ?? COLORS[0])?.bg }" />
            <span>{{ segment }}</span>
            <em>{{ index + 1 }}</em>
          </li>
        </ul>
      </div>

      <div class="foot">
        <div class="foot-text">
          <span>{{ done ? '转盘已停稳' : '转盘旋转中' }}</span>
          <span v-if="done && payload.autoCloseSeconds > 0">结果窗口将自动关闭</span>
        </div>
        <div v-if="done && payload.autoCloseSeconds > 0" class="progress">
          <i :style="{ animationDuration: payload.autoCloseSeconds + 's' }" />
        </div>
      </div>
    </aside>
  </div>
</template>
