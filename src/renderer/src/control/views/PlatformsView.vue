<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/StatusPill.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { actions, selectPlatform, state } from '../store'
import { showToast } from '../store'

const mock = computed(() => selectPlatform(state.snapshot, 'mock'))
const bilibili = computed(() => selectPlatform(state.snapshot, 'bilibili'))

const roomId = ref('')
const biliEnabled = ref(false)
const mockEnabled = ref(false)
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
    if (typeof config.enabled === 'boolean') mockEnabled.value = config.enabled
    if (typeof config.botsEnabled === 'boolean') botsEnabled.value = config.botsEnabled
    if (typeof config.botsIntervalSeconds === 'number') botsInterval.value = config.botsIntervalSeconds
  },
  { immediate: true }
)

async function setBiliEnabled(next: boolean): Promise<void> {
  if (next && roomId.value.trim().length === 0) {
    biliEnabled.value = false
    showToast('先填写直播间房间号', 'error')
    return
  }

  biliEnabled.value = next
  const ok = await actions.updatePlatformConfig('bilibili', {
    roomId: roomId.value.trim(),
    enabled: next
  })
  if (!ok) {
    biliEnabled.value = !next
    return
  }

  if (next) await actions.connect('bilibili')
  else await actions.disconnect('bilibili')
}

async function setMockEnabled(next: boolean): Promise<void> {
  mockEnabled.value = next
  const ok = await actions.updatePlatformConfig('mock', { enabled: next })
  if (!ok) {
    mockEnabled.value = !next
    return
  }

  if (next) await actions.connect('mock')
  else await actions.disconnect('mock')
}

async function setBotsEnabled(next: boolean): Promise<void> {
  botsEnabled.value = next
  await actions.updatePlatformConfig('mock', { botsEnabled: next })
}

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

      <p v-if="bilibili?.status.detail" class="detail" :class="bilibili.status.phase">
        {{ bilibili.status.detail }}
      </p>

      <div class="form">
        <label class="field">
          <span>直播间房间号</span>
          <input v-model="roomId" placeholder="房间号或直播间 URL" maxlength="256" />
        </label>
        <div class="switch-row">
          <div>
            <strong>启用 B站弹幕源</strong>
            <span>关闭即断开，不再接收弹幕</span>
          </div>
          <ToggleSwitch
            v-model="biliEnabled"
            label="启用 B站弹幕源"
            @update:modelValue="setBiliEnabled"
          />
        </div>
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
            v-if="biliEnabled"
            class="secondary"
            @click="connectBilibili"
          >
            {{ bilibili?.status.phase === 'connecting' ? '连接中…' : '重新连接' }}
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

      <p v-if="mock?.status.detail" class="detail" :class="mock.status.phase">
        {{ mock.status.detail }}
      </p>

      <div class="form">
        <div class="switch-stack">
          <div class="switch-row">
            <div>
              <strong>启用模拟源</strong>
              <span>关闭即断开本地模拟</span>
            </div>
            <ToggleSwitch
              v-model="mockEnabled"
              label="启用本地模拟源"
              @update:modelValue="setMockEnabled"
            />
          </div>
          <div class="switch-row">
            <div>
              <strong>自动观众</strong>
              <span>按间隔发送力度指令</span>
            </div>
            <ToggleSwitch
              v-model="botsEnabled"
              label="自动观众"
              @update:modelValue="setBotsEnabled"
            />
          </div>
        </div>
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
            v-if="mockEnabled"
            class="secondary"
            @click="connectMock"
          >
            {{ mock?.status.phase === 'connecting' ? '连接中…' : '重新连接' }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.platforms {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
  border-left: 2px solid var(--hairline-strong);
  border-radius: 4px;
  background: var(--surface-active);
  color: var(--mute);
  font-size: 11px;
  line-height: 17px;
}

.detail.error {
  border-left-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

.detail.reconnecting {
  border-left-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
}

.form {
  display: flex;
  align-items: flex-end;
  gap: var(--s-4);
}

.switch-row {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.switch-row div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-row strong {
  color: var(--body);
  font-size: 12px;
  font-weight: 500;
}

.switch-row span {
  color: var(--mute);
  font-size: 10px;
}

.switch-stack {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--s-3);
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

@media (min-width: 1500px) {
  .platforms {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
