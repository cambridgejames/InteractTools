<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function toggle(): void {
  if (props.disabled === true) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="switch"
    :class="{ on: modelValue }"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-chip);
  background: var(--surface-active);
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.switch.on {
  border-color: var(--accent);
  background: var(--accent);
}

.switch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.switch:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.knob {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--mute);
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.switch.on .knob {
  background: var(--accent-ink);
  transform: translateX(16px);
}
</style>
