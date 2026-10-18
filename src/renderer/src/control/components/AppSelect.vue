<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

interface SelectOption {
  readonly value: string
  readonly label: string
}

const props = defineProps<{
  modelValue: string
  options: readonly SelectOption[]
  disabled?: boolean
  label?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const placement = ref<'down' | 'up'>('down')
const selected = computed(() => props.options.find((option) => option.value === props.modelValue))

function toggle(): void {
  if (props.disabled === true) return
  if (!open.value) {
    const rect = root.value?.getBoundingClientRect()
    placement.value = rect !== undefined && window.innerHeight - rect.bottom < 240 && rect.top > 240
      ? 'up'
      : 'down'
  }
  open.value = !open.value
}

function choose(value: string): void {
  open.value = false
  if (value !== props.modelValue) emit('update:modelValue', value)
}

function onPointerDown(event: PointerEvent): void {
  if (!open.value) return
  if (event.target instanceof Node && root.value?.contains(event.target) === true) return
  open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      return
    }
    const index = props.options.findIndex((option) => option.value === props.modelValue)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const next = props.options[(index + delta + props.options.length) % props.options.length]
    if (next !== undefined) choose(next.value)
  }
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="app-select" :class="{ open, disabled }">
    <button
      type="button"
      class="trigger"
      :disabled="disabled"
      :aria-label="label"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span>{{ selected?.label ?? '请选择' }}</span>
      <AppIcon name="chevron" :size="14" />
    </button>

    <ul v-if="open" class="menu" :class="{ up: placement === 'up' }" role="listbox">
      <li v-for="option in options" :key="option.value">
        <button
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          :class="{ selected: option.value === modelValue }"
          @click="choose(option.value)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  min-width: 0;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 12px;
  text-align: left;
}

.trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger:hover:not(:disabled),
.open .trigger {
  border-color: var(--accent);
}

.trigger:disabled {
  opacity: 0.5;
}

.open .trigger svg {
  transform: rotate(180deg);
}

.trigger svg {
  flex: none;
  color: var(--mute);
  transition: transform var(--dur-fast) var(--ease-out);
}

.menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 30;
  max-height: 240px;
  overflow: auto;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-control);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  list-style: none;
}

.menu.up {
  top: auto;
  bottom: calc(100% + 4px);
}

.menu button {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--body);
  font-size: 12px;
  text-align: left;
}

.menu button:hover,
.menu button.selected {
  background: var(--surface-active);
  color: var(--accent);
}
</style>
