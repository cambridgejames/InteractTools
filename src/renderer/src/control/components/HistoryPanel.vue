<script setup lang="ts">
import type { DiceResult } from '@contracts/dice'
import AppIcon from './AppIcon.vue'
import { actions } from '../store'
import { facesLabel, formatDateTime, formatPower, methodLabel } from '../../shared/format'

defineProps<{ history: readonly DiceResult[] }>()
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>投掷记录</h2>
        <p>本地保存，最多保留 20 条</p>
      </div>
      <button v-if="history.length > 0" class="mini" @click="actions.clearHistory()">清空记录</button>
    </header>

    <div v-if="history.length === 0" class="empty">
      <AppIcon name="history" :size="28" />
      <strong>还没有投掷记录</strong>
      <span>开始一轮，结果会留在这里。</span>
    </div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>时间</th>
          <th>骰子</th>
          <th>力度</th>
          <th>聚合</th>
          <th class="right">结果</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in history" :key="item.rollId">
          <td class="mono time">{{ formatDateTime(item.at) }}</td>
          <td>{{ facesLabel(item.faces) }}</td>
          <td class="mono">{{ formatPower(item.power) }}</td>
          <td>{{ methodLabel(item.summary.method) }}</td>
          <td class="right">
            <span class="result mono">{{ item.value }}</span>
            <span v-if="!item.settled" class="warn" title="未完全停稳">!</span>
          </td>
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

.mini {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mute);
  font-size: 12px;
}

.mini:hover {
  background: var(--surface-hover);
  color: var(--danger);
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

.right {
  text-align: right;
}

.result {
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
}

.warn {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  margin-left: 4px;
  border-radius: 50%;
  background: var(--warning);
  color: var(--canvas);
  font-size: 12px;
  font-weight: 700;
}
</style>
