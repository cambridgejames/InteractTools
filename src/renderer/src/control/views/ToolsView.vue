<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { selectDice, state } from '../store'
import { DICE_FACES } from '@contracts/dice'

const emit = defineEmits<{ navigate: [page: 'dashboard'] }>()
const dice = computed(() => selectDice(state.snapshot))
</script>

<template>
  <div class="tools">
    <section class="tool-card active">
      <header>
        <span class="icon"><AppIcon name="dice" :size="20" /></span>
        <span class="status">已启用</span>
      </header>
      <h2>投骰子</h2>
      <p>弹幕设置力度，倒计时结束后聚合，用真实刚体物理掷骰并在独立窗口播放结果。</p>
      <div class="tags">
        <span v-for="faces in DICE_FACES" :key="faces" class="tag">D{{ faces }}</span>
      </div>
      <footer>
        <span class="meta">{{ dice ? dice.history.length + ' 条记录' : '加载中' }}</span>
        <button class="open" @click="emit('navigate', 'dashboard')">去控制台</button>
      </footer>
    </section>

    <section class="tool-card muted-card">
      <header>
        <span class="icon"><AppIcon name="gift" :size="20" /></span>
        <span class="status soon">即将推出</span>
      </header>
      <h2>礼物答谢</h2>
      <p>礼物队列、防刷屏、语音播报。等第一个工具稳定后接入。</p>
      <div class="tags">
        <span class="tag">礼物</span>
        <span class="tag">TTS</span>
      </div>
      <footer>
        <span class="meta">规划中</span>
      </footer>
    </section>

    <section class="tool-card muted-card">
      <header>
        <span class="icon"><AppIcon name="users" :size="20" /></span>
        <span class="status soon">即将推出</span>
      </header>
      <h2>弹幕投票</h2>
      <p>扣 1 计数、选项投票、实时排行，复用同一套命令与呈现协议。</p>
      <div class="tags">
        <span class="tag">投票</span>
        <span class="tag">排行</span>
      </div>
      <footer>
        <span class="meta">规划中</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.tools {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-5);
  max-width: var(--content-max);
  margin: 0 auto;
}

.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-height: 240px;
  padding: var(--s-5);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

.tool-card.active {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--hairline));
}

.tool-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--accent);
}

.status {
  padding: 3px 8px;
  border-radius: var(--r-chip);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 500;
}

.status.soon {
  background: var(--surface-active);
  color: var(--faint);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

p {
  margin: 0;
  color: var(--mute);
  font-size: 12px;
  line-height: 18px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 10px;
}

footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.meta {
  color: var(--faint);
  font-size: 11px;
}

.open {
  height: 28px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--body);
  font-size: 11px;
}

.open:hover {
  background: var(--surface-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.muted-card {
  opacity: 0.62;
}

@media (max-width: 1180px) {
  .tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .tools {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
