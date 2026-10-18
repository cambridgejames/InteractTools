<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Presentation } from '@contracts/presentation'
import DiceOverlay from './DiceOverlay.vue'
import WheelOverlay from './WheelOverlay.vue'

const presentation = ref<Presentation | null>(null)
let unsubscribe: (() => void) | null = null
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const dice = computed(() =>
  presentation.value?.kind === 'dice.roll' ? presentation.value.payload : null
)
const wheel = computed(() =>
  presentation.value?.kind === 'wheel.spin' ? presentation.value.payload : null
)

onMounted(() => {
  unsubscribe = window.overlayApi.onPresentation(handlePresentation)
  window.overlayApi.ready()
})

onUnmounted(() => {
  unsubscribe?.()
  clearDismiss()
})

function handlePresentation(next: Presentation): void {
  clearDismiss()
  if (next.kind === 'dismiss') {
    presentation.value = null
    return
  }
  presentation.value = next
}

function onFinished(): void {
  const current = presentation.value
  if (current === null || current.kind === 'dismiss') return
  const autoClose = current.payload.autoCloseSeconds
  if (autoClose <= 0) return

  clearDismiss()
  dismissTimer = setTimeout(() => {
    window.overlayApi.dismiss()
  }, autoClose * 1000)
}

function clearDismiss(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}
</script>

<template>
  <div class="overlay-root" :class="{ visible: presentation !== null }">
    <DiceOverlay
      v-if="dice"
      :key="dice.rollId"
      :payload="dice"
      @finished="onFinished"
    />
    <WheelOverlay
      v-else-if="wheel"
      :key="wheel.spinId"
      :payload="wheel"
      @finished="onFinished"
    />
  </div>
</template>
