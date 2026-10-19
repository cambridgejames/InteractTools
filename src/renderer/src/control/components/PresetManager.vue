<script setup lang="ts">
import { ref } from 'vue'

interface PresetRow {
  readonly id: string
  readonly name: string
  readonly meta: string
}

withDefaults(
  defineProps<{
    presets: readonly PresetRow[]
    disabled?: boolean
    title?: string
    hint?: string
    placeholder?: string
    emptyText?: string
  }>(),
  {
    title: '预设',
    hint: '保存当前配置',
    placeholder: '例如 真心话',
    emptyText: '把当前配置存成预设，下次一键载入。'
  }
)
const emit = defineEmits<{ save: [name: string]; apply: [id: string]; remove: [id: string] }>()

const presetName = ref('')

function submit(): void {
  const name = presetName.value.trim()
  emit('save', name)
  if (name.length > 0) presetName.value = ''
}
</script>

<template>
  <div class="presets">
    <div class="preset-head">
      <span>{{ title }}</span>
      <span>{{ hint }}</span>
    </div>

    <div class="preset-save">
      <input
        v-model="presetName"
        maxlength="20"
        :placeholder="placeholder"
        :disabled="disabled"
        @keyup.enter="submit"
      />
      <button class="preset-add" :disabled="disabled" @click="submit">保存</button>
    </div>

    <div v-if="presets.length > 0" class="preset-list">
      <div v-for="preset in presets" :key="preset.id" class="preset-row">
        <button class="preset-apply" :disabled="disabled" @click="emit('apply', preset.id)">
          <strong>{{ preset.name }}</strong>
          <small>{{ preset.meta }}</small>
        </button>
        <button
          class="preset-remove"
          :aria-label="'删除预设 ' + preset.name"
          :disabled="disabled"
          @click="emit('remove', preset.id)"
        >
          ×
        </button>
      </div>
    </div>

    <p v-else class="preset-empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.presets {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.preset-head {
  display: flex;
  justify-content: space-between;
  color: var(--mute);
  font-size: 10px;
}

.preset-save {
  display: flex;
  gap: var(--s-2);
}

.preset-save input {
  min-width: 0;
  flex: 1;
  height: 32px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 11px;
}

.preset-add,
.preset-remove {
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--surface-active);
  color: var(--body);
  font-size: 11px;
}

.preset-add {
  padding: 0 var(--s-3);
}

.preset-add:hover:not(:disabled),
.preset-remove:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.preset-add:disabled,
.preset-apply:disabled,
.preset-remove:disabled {
  opacity: 0.5;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-row {
  display: flex;
  gap: 4px;
}

.preset-apply {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-2);
  min-width: 0;
  padding: 6px var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  text-align: left;
}

.preset-apply:hover:not(:disabled) {
  border-color: var(--accent);
}

.preset-apply strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-apply small {
  flex: none;
  color: var(--faint);
  font-size: 9px;
}

.preset-remove {
  width: 30px;
  flex: none;
  padding: 0;
  font-size: 14px;
}

.preset-empty {
  margin: 0;
  color: var(--faint);
  font-size: 10px;
  line-height: 15px;
}
</style>
