<script setup lang="ts">
import { computed } from 'vue'
import DicePanel from '../components/DicePanel.vue'
import FeedPanel from '../components/FeedPanel.vue'
import HistoryPanel from '../components/HistoryPanel.vue'
import { selectDice, state } from '../store'

defineEmits<{ navigate: [page: 'dashboard'] }>()

const dice = computed(() => selectDice(state.snapshot))
</script>

<template>
  <div class="dashboard">
    <div class="main-col">
      <DicePanel v-if="dice" :view="dice" />
      <section v-else class="empty-card">
        <strong>正在加载投骰子工具…</strong>
        <span>如果持续出现，检查主进程日志。</span>
      </section>
    </div>
    <FeedPanel />
    <HistoryPanel class="history" :history="dice?.history ?? []" />
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: var(--s-5);
  align-items: start;
  max-width: var(--content-max);
  margin: 0 auto;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.history {
  grid-column: 1 / -1;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: 48px;
  border: 1px dashed var(--hairline-strong);
  border-radius: var(--r-card);
  color: var(--mute);
}

.empty-card strong {
  color: var(--body);
  font-size: 14px;
  font-weight: 500;
}

.empty-card span {
  font-size: 12px;
}

@media (max-width: 1180px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr);
  }

  .history {
    grid-column: auto;
  }
}
</style>
