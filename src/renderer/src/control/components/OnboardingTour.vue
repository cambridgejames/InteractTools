<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

type TourIcon = 'platforms' | 'dice' | 'wheel' | 'vote' | 'globe' | 'keyboard'

interface TourStep {
  readonly icon: TourIcon
  readonly title: string
  readonly body: string
  readonly hint: string
}

const steps: readonly TourStep[] = [
  {
    icon: 'platforms',
    title: '先接一个直播间',
    body: '打开「设置 → 平台连接」，填 B站房间号或抖音直播间地址。所有平台都是只读：只收弹幕、礼物和进场，不会替你发言或送礼。',
    hint: '没有直播间也可以先用本地模拟试玩。'
  },
  {
    icon: 'dice',
    title: '选一个今晚的玩法',
    body: '控制台顶部可以切换投骰子、转转盘和弹幕投票。转盘和投票都带预设，真心话、大冒险一键载入。',
    hint: '工具参数会自动保存，下次打开还是这套设置。'
  },
  {
    icon: 'vote',
    title: '弹幕就在右边',
    body: '右侧弹幕栏会实时显示聊天和礼物，进场观众合并成底部的一行提示。向上翻看历史时不会强制拉回底部，有新消息会提示你。',
    hint: '点击「N 条新弹幕」或自己滚到底，就能回到最新消息。'
  },
  {
    icon: 'keyboard',
    title: '把常用动作绑成快捷键',
    body: '「设置 → 快捷键」可以录显示/隐藏窗口、显示/隐藏弹幕栏、清空弹幕和打开设置。默认全部为空，需要时再绑定，也可以设为全局。',
    hint: '关闭/退出组合固定不可绑定，避免直播时误退。'
  },
  {
    icon: 'globe',
    title: '网络有问题再看这里',
    body: '「设置 → 网络」支持系统代理和自定义代理，可填用户名、密码和直连域名。内网自签名证书可以临时跳过校验，测试连通性会分别显示每个平台。',
    hint: '代理只影响平台连接，不影响本地模拟。'
  }
]

const step = ref(0)
const current = computed<TourStep>(() => steps[step.value] ?? steps[0] ?? {
  icon: 'platforms',
  title: '操作指引',
  body: '按下一步继续。',
  hint: 'Esc 可以跳过。'
})
const last = computed(() => step.value === steps.length - 1)
const emit = defineEmits<{ done: [] }>()

function next(): void {
  if (last.value) {
    emit('done')
    return
  }
  step.value += 1
}

function previous(): void {
  if (step.value > 0) step.value -= 1
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('done')
  if (event.key === 'ArrowRight') next()
  if (event.key === 'ArrowLeft') previous()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="tour-backdrop" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <section class="tour-card">
        <header class="tour-head">
          <span class="tour-icon"><AppIcon :name="current.icon" :size="20" /></span>
          <span class="tour-count">{{ String(step + 1).padStart(2, '0') }} / {{ String(steps.length).padStart(2, '0') }}</span>
        </header>

        <h2 id="tour-title">{{ current.title }}</h2>
        <p class="tour-body">{{ current.body }}</p>
        <p class="tour-hint">{{ current.hint }}</p>

        <footer class="tour-foot">
          <div class="tour-dots" aria-label="教程进度">
            <button
              v-for="(item, index) in steps"
              :key="item.title"
              class="tour-dot"
              :class="{ active: index === step }"
              type="button"
              :aria-label="'第 ' + String(index + 1) + ' 步'"
              @click="step = index"
            />
          </div>
          <div class="tour-actions">
            <button class="tour-skip" type="button" @click="emit('done')">跳过</button>
            <button v-if="step > 0" class="tour-prev" type="button" @click="previous">上一步</button>
            <button class="tour-next" type="button" @click="next">{{ last ? '开始使用' : '下一步' }}</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: var(--s-5);
  background: var(--overlay-veil);
  backdrop-filter: blur(6px);
}

.tour-card {
  width: min(520px, 100%);
  padding: var(--s-5);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-card);
  background: var(--canvas-elevated);
  box-shadow: var(--shadow-pop);
}

.tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tour-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--hairline));
  border-radius: var(--r-icon);
  background: var(--accent-soft);
  color: var(--accent);
}

.tour-count {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 12px;
}

h2 {
  margin: var(--s-4) 0 var(--s-2);
  color: var(--ink);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.tour-body {
  margin: 0;
  color: var(--body);
  font-size: 14px;
  line-height: 22px;
}

.tour-hint {
  margin: var(--s-3) 0 0;
  padding: var(--s-2) var(--s-3);
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
  color: var(--mute);
  font-size: 12px;
  line-height: 18px;
}

.tour-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  margin-top: var(--s-5);
}

.tour-dots {
  display: flex;
  gap: 6px;
}

.tour-dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--hairline-strong);
}

.tour-dot.active {
  width: 18px;
  border-radius: var(--r-chip);
  background: var(--accent);
}

.tour-actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.tour-skip,
.tour-prev,
.tour-next {
  height: 32px;
  padding: 0 var(--s-3);
  border-radius: var(--r-control);
  font-size: 12px;
}

.tour-skip,
.tour-prev {
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--mute);
}

.tour-next {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 500;
}

.tour-skip:hover,
.tour-prev:hover {
  color: var(--body);
  border-color: var(--hairline-strong);
}

.tour-next:hover {
  filter: brightness(1.05);
}
</style>
