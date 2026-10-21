<script setup lang="ts">
import { state } from '../store'
</script>

<template>
  <Transition name="toast">
    <div v-if="state.toast" class="toast" :class="'tone-' + state.toast.tone" role="status">
      {{ state.toast.message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  right: var(--s-6);
  bottom: var(--s-6);
  z-index: 60;
  width: 320px;
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--hairline-strong);
  border-left: 2px solid var(--info);
  border-radius: var(--r-card);
  background: var(--surface-active);
  box-shadow: var(--shadow-pop);
  color: var(--body);
  font-size: 13px;
}

.tone-success {
  border-left-color: var(--success);
}

.tone-error {
  border-left-color: var(--danger);
}

.tone-info {
  border-left-color: var(--info);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
