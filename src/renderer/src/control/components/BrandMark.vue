<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    role="img"
    aria-label="互动工坊"
  >
    <path
      fill="currentColor"
      fill-rule="evenodd"
      d="M8 3h8a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-4l-4 4v-4H8a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm4 4L10.8 10.2 7.6 11.4l3.2 1.2L12 16l1.2-3.4 3.2-1.2-3.2-1.2L12 7Z"
    />
  </svg>
</template>
