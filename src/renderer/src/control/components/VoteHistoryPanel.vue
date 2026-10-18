<script setup lang="ts">
import type { VoteResult } from '@contracts/vote'
import AppIcon from './AppIcon.vue'
import { formatTime } from '../../shared/format'

const props = defineProps<{ history: readonly VoteResult[] }>()

function winnerLabel(item: VoteResult): string {
  if (item.winners.length === 0) return '无人投票'
  return item.winners.map((index) => item.options[index] ?? '').join(' / ')
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>投票记录</h2>
        <p>最近 20 轮 · 只保存统计结果</p>
      </div>
    </header>

    <div v-if="props.history.length === 0" class="empty">
      <AppIcon name="vote" :size="28" />
      <strong>还没有投票记录</strong>
      <span>在控制台点一次「开始投票」。</span>
    </div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>时间</th>
          <th>问题</th>
          <th class="right">票数</th>
          <th>胜出</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in props.history" :key="item.id">
          <td class="mono time">{{ formatTime(item.at) }}</td>
          <td class="question">{{ item.question || '本轮投票' }}</td>
          <td class="right mono">{{ item.totalVotes }}</td>
          <td><span class="result">{{ winnerLabel(item) }}</span></td>
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
  font-size: 11px;
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
  font-size: 13px;
  font-weight: 500;
}

.empty span {
  font-size: 11px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 8px var(--s-5);
  color: var(--mute);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.8px;
  text-align: left;
  text-transform: uppercase;
}

td {
  padding: 10px var(--s-5);
  border-top: 1px solid var(--hairline);
  color: var(--body);
  font-size: 12px;
}

tr:hover td {
  background: var(--surface-hover);
}

.time {
  color: var(--mute);
  font-size: 11px;
}

.question {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result {
  color: var(--accent);
  font-weight: 600;
}

.right {
  text-align: right;
}
</style>
