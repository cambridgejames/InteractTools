<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/StatusPill.vue'
import { actions, selectPlatform, state } from '../store'
import { showToast } from '../store'

const mock = computed(() => selectPlatform(state.snapshot, 'mock'))
const bilibili = computed(() => selectPlatform(state.snapshot, 'bilibili'))

const roomId = ref('')
const biliEnabled = ref(false)
const botsEnabled = ref(true)
const botsInterval = ref(3)

watch(
  () => bilibili.value?.config,
  (config) => {
    if (config === undefined) return
    if (typeof config.roomId === 'string') roomId.value = config.roomId
    if (typeof config.enabled === 'boolean') biliEnabled.value = config.enabled
  },
  { immediate: true }
)

watch(
  () => mock.value?.config,
  (config) => {
    if (config === undefined) return
    if (typeof config.botsEnabled === 'boolean') botsEnabled.value = config.botsEnabled
    if (typeof config.botsIntervalSeconds === 'number') botsInterval.value = config.botsIntervalSeconds
  },
  { immediate: true }
)

async function saveBilibili(): Promise<void> {
  const ok = await actions.updatePlatformConfig('bilibili', {
    roomId: roomId.value.trim(),
    enabled: biliEnabled.value
  })
  if (ok) showToast('B站配置已保存', 'success')
}

async function connectBilibili(): Promise<void> {
  if (roomId.value.trim().length === 0) {
    showToast('先填写直播间房间号', 'error')
    return
  }
  const ok = await actions.updatePlatformConfig('bilibili', {
    roomId: roomId.value.trim(),
    enabled: true
  })
  if (!ok) return
  biliEnabled.value = true
  await actions.connect('bilibili')
}

async function saveMock(): Promise<void> {
  const ok = await actions.updatePlatformConfig('mock', {
    botsEnabled: botsEnabled.value,
    botsIntervalSeconds: botsInterval.value
  })
  if (ok) showToast('模拟源配置已保存', 'success')
}

async function connectMock(): Promise<void> {
  const ok = await actions.updatePlatformConfig('mock', { enabled: true })
  if (!ok) return
  await actions.connect('mock')
}
</script>

<template>
  <div class="platforms">
    <section class="card">
      <header>
        <div class="platform-title">
          <span class="icon bili"><AppIcon name="bilibili" :size="20" /></span>
          <div>
            <h2>哔哩哔哩</h2>
            <p>匿名只读弹幕 · 不登录、不发消息</p>
          </div>
        </div>
        <StatusPill v-if="bilibili" :phase="bilibili.status.phase" />
      </header>

      <p v-if="bilibili?.status.detail" class="detail">{{ bilibili.status.detail }}</p>

      <div class="form">
        <label class="field">
          <span>直播间房间号</span>
          <input v-model="roomId" placeholder="例如 6" maxlength="32" />
        </label>
        <label class="check">
          <input v-model="biliEnabled" type="checkbox" />
          <span>启动时自动连接</span>
        </label>
      </div>

      <div class="capabilities">
        <span>弹幕</span>
        <span>礼物</span>
        <span>进场</span>
      </div>

      <footer>
        <button class="secondary" @click="saveBilibili">保存配置</button>
        <div class="right">
          <button
            v-if="bilibili?.status.phase === 'connected'"
            class="danger"
            @click="actions.disconnect('bilibili')"
          >
            断开
          </button>
          <button v-else class="primary" @click="connectBilibili">
            {{ bilibili?.status.phase === 'connecting' ? '连接中…' : '连接 B站' }}
          </button>
        </div>
      </footer>
    </section>

    <section class="card">
      <header>
        <div class="platform-title">
          <span class="icon"><AppIcon name="users" :size="20" /></span>
          <div>
            <h2>本地模拟</h2>
            <p>离线演示 · 自动观众会发送力度指令</p>
          </div>
        </div>
        <StatusPill v-if="mock" :phase="mock.status.phase" />
      </header>

      <p v-if="mock?.status.detail" class="detail">{{ mock.status.detail }}</p>

      <div class="form">
        <label class="check">
          <input v-model="botsEnabled" type="checkbox" />
          <span>自动观众</span>
        </label>
        <label class="field compact">
          <span>发送间隔</span>
          <div class="unit">
            <input v-model.number="botsInterval" type="number" min="1" max="60" />
            <em>秒</em>
          </div>
        </label>
      </div>

      <div class="capabilities">
        <span>弹幕</span>
        <span>礼物</span>
        <span>手动注入</span>
      </div>

      <footer>
        <button class="secondary" @click="saveMock">保存配置</button>
        <div class="right">
          <button
            v-if="mock?.status.phase === 'connected'"
            class="danger"
            @click="actions.disconnect('mock')"
          >
            断开
          </button>
          <button v-else class="primary" @click="connectMock">连接模拟源</button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.platforms {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  max-width: var(--content-max);
  margin: 0 auto;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-5);
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--surface);
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
}

.platform-title {
  display: flex;
  align-items: center;
  gap: var(--s-3);
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

.icon.bili {
  color: var(--bilibili);
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.platform-title p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.detail {
  margin: 0;
  padding: var(--s-2) var(--s-3);
  border-left: 2px solid var(--danger);
  border-radius: 4px;
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
  font-size: 11px;
  line-height: 17px;
}

.form {
  display: flex;
  align-items: flex-end;
  gap: var(--s-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  color: var(--mute);
  font-size: 11px;
}

.field.compact {
  flex: 0 0 112px;
}

.field input {
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 12px;
}

.unit {
  position: relative;
}

.unit input {
  padding-right: 30px;
}

.unit em {
  position: absolute;
  right: 10px;
  top: 10px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  color: var(--body);
  font-size: 12px;
  white-space: nowrap;
}

.check input {
  accent-color: var(--accent);
}

.capabilities {
  display: flex;
  gap: 6px;
}

.capabilities span {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  color: var(--faint);
  font-size: 10px;
}

footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin-top: auto;
  padding-top: var(--s-4);
  border-top: 1px solid var(--hairline);
}

.right {
  display: flex;
  gap: var(--s-2);
}

.primary,
.secondary,
.danger {
  height: 32px;
  padding: 0 var(--s-3);
  border-radius: var(--r-control);
  font-size: 12px;
  font-weight: 500;
}

.primary {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.secondary {
  border: 1px solid var(--hairline-strong);
  background: transparent;
  color: var(--body);
}

.secondary:hover {
  background: var(--surface-hover);
}

.danger {
  border: 1px solid transparent;
  background: transparent;
  color: var(--danger);
}

.danger:hover {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

@media (max-width: 1180px) {
  .platforms {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
