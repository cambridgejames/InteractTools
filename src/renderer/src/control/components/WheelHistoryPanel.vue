<script setup lang="ts">
import type { WheelResult } from '@contracts/wheel'
import AppIcon from './AppIcon.vue'
import { formatTime } from '../../shared/format'

defineProps<{ history: readonly WheelResult[] }>()
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>转盘记录</h2>
        <p>主播手动旋转 · 最近 20 条</p>
      </div>
    </header>

    <div v-if="history.length === 0" class="empty">
      <AppIcon name="wheel" :size="28" />
      <strong>还没有转盘记录</strong>
      <span>在控制台点一次「开始旋转」。</span>
    </div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>时间</th>
          <th>结果</th>
          <th class="right">格子</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in history" :key="item.spinId">
          <td class="mono time">{{ formatTime(item.at) }}</td>
          <td><span class="result">{{ item.label }}</span></td>
          <td class="right mono">{{ item.index + 1 }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--hairline);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.card-head p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 12px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  padding: 44px var(--s-5);
  color: var(--mute);
  text-align: center;
}

.empty strong {
  color: var(--body);
  font-size: 14px;
  font-weight: 500;
}

.empty span {
  font-size: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 8px var(--s-5);
  color: var(--mute);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.8px;
  text-align: left;
  text-transform: uppercase;
}

td {
  padding: 10px var(--s-5);
  border-top: 1px solid var(--hairline);
  color: var(--body);
  font-size: 13px;
}

tr:hover td {
  background: var(--surface-hover);
}

.time {
  color: var(--mute);
  font-size: 12px;
}

.result {
  color: var(--accent);
  font-weight: 600;
}

.right {
  text-align: right;
}
</style>
