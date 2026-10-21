<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/StatusPill.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { actions, selectPlatform, state } from '../store'
import { showToast } from '../store'

const mock = computed(() => selectPlatform(state.snapshot, 'mock'))
const bilibili = computed(() => selectPlatform(state.snapshot, 'bilibili'))
const douyin = computed(() => selectPlatform(state.snapshot, 'douyin'))

const roomId = ref('')
const douyinRoomId = ref('')
const douyinSigner = ref('http://127.0.0.1:18080')
const biliEnabled = ref(false)
const douyinEnabled = ref(false)
const mockEnabled = ref(false)
const botsEnabled = ref(true)
const botsInterval = ref(3)
const userCount = ref(8)
let biliTimer: ReturnType<typeof setTimeout> | null = null
let douyinTimer: ReturnType<typeof setTimeout> | null = null
let mockTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (biliTimer !== null) clearTimeout(biliTimer)
  if (douyinTimer !== null) clearTimeout(douyinTimer)
  if (mockTimer !== null) clearTimeout(mockTimer)
})

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
  () => douyin.value?.config,
  (config) => {
    if (config === undefined) return
    if (typeof config.roomId === 'string') douyinRoomId.value = config.roomId
    if (typeof config.signerUrl === 'string') douyinSigner.value = config.signerUrl
    if (typeof config.enabled === 'boolean') douyinEnabled.value = config.enabled
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
    if (typeof config.userCount === 'number') userCount.value = config.userCount
  },
  { immediate: true }
)

watch(roomId, () => scheduleBiliSave())
watch([douyinRoomId, douyinSigner], () => scheduleDouyinSave())
watch([botsInterval, userCount], () => scheduleMockSave())

function scheduleBiliSave(): void {
  if (biliTimer !== null) clearTimeout(biliTimer)
  biliTimer = setTimeout(() => {
    biliTimer = null
    void persistBilibili()
  }, 600)
}

function scheduleMockSave(): void {
  if (mockTimer !== null) clearTimeout(mockTimer)
  mockTimer = setTimeout(() => {
    mockTimer = null
    void persistMock()
  }, 600)
}

async function persistBilibili(): Promise<void> {
  const config = bilibili.value?.config
  if (config === undefined) return
  const nextRoom = roomId.value.trim()
  if (nextRoom.length === 0 && biliEnabled.value) biliEnabled.value = false
  const enabled = biliEnabled.value
  if (nextRoom === String(config.roomId ?? '') && enabled === Boolean(config.enabled)) return
  await actions.updatePlatformConfig('bilibili', { roomId: nextRoom, enabled })
}

function scheduleDouyinSave(): void {
  if (douyinTimer !== null) clearTimeout(douyinTimer)
  douyinTimer = setTimeout(() => {
    douyinTimer = null
    void persistDouyin()
  }, 600)
}

async function persistDouyin(): Promise<void> {
  const config = douyin.value?.config
  if (config === undefined) return
  const room = douyinRoomId.value.trim()
  const signerUrl = douyinSigner.value.trim()
  if (room === String(config.roomId ?? '') &&
      signerUrl === String(config.signerUrl ?? '') &&
      douyinEnabled.value === Boolean(config.enabled)) {
    return
  }
  await actions.updatePlatformConfig('douyin', {
    roomId: room,
    signerUrl,
    enabled: douyinEnabled.value
  })
}

async function persistMock(): Promise<void> {
  const config = mock.value?.config
  if (config === undefined) return
  const raw = Number(botsInterval.value)
  const next = Number.isFinite(raw) ? Math.min(60, Math.max(1, Math.round(raw))) : 3
  botsInterval.value = next
  const rawUsers = Number(userCount.value)
  const nextUsers = Number.isFinite(rawUsers) ? Math.min(100, Math.max(1, Math.round(rawUsers))) : 8
  userCount.value = nextUsers
  if (next === config.botsIntervalSeconds && nextUsers === config.userCount) return
  await actions.updatePlatformConfig('mock', {
    botsIntervalSeconds: next,
    userCount: nextUsers
  })
}

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

async function setDouyinEnabled(next: boolean): Promise<void> {
  if (next && (douyinRoomId.value.trim().length === 0 || douyinSigner.value.trim().length === 0)) {
    douyinEnabled.value = false
    showToast('先填写直播间号和签名服务地址', 'error')
    return
  }

  douyinEnabled.value = next
  const ok = await actions.updatePlatformConfig('douyin', {
    roomId: douyinRoomId.value.trim(),
    signerUrl: douyinSigner.value.trim(),
    enabled: next
  })
  if (!ok) {
    douyinEnabled.value = !next
    return
  }

  if (next) await actions.connect('douyin')
  else await actions.disconnect('douyin')
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
        <div class="card-controls">
          <StatusPill v-if="bilibili" :phase="bilibili.status.phase" />
          <ToggleSwitch
            v-model="biliEnabled"
            label="启用 B站弹幕源"
            @update:modelValue="setBiliEnabled"
          />
        </div>
      </header>

      <p v-if="bilibili?.status.detail" class="detail" :class="bilibili.status.phase">
        {{ bilibili.status.detail }}
      </p>

      <div class="form">
        <label class="field">
          <span>直播间房间号</span>
          <input v-model="roomId" placeholder="房间号或直播间 URL" maxlength="256" />
        </label>
      </div>


    </section>

    <section class="card">
      <header>
        <div class="platform-title">
          <span class="icon douyin"><AppIcon name="douyin" :size="20" /></span>
          <div>
            <h2>抖音</h2>
            <p>匿名只读弹幕 · 不登录、不发送内容</p>
          </div>
        </div>
        <div class="card-controls">
          <StatusPill v-if="douyin" :phase="douyin.status.phase" />
          <ToggleSwitch
            v-model="douyinEnabled"
            label="启用抖音弹幕源"
            @update:modelValue="setDouyinEnabled"
          />
        </div>
      </header>

      <p v-if="douyin?.status.detail" class="detail" :class="douyin.status.phase">
        {{ douyin.status.detail }}
      </p>

      <div class="form douyin-form">
        <label class="field">
          <span>直播间号或链接</span>
          <input v-model="douyinRoomId" placeholder="例如 123456789 或 live.douyin.com/..." maxlength="256" />
        </label>
        <label class="field">
          <span>签名服务地址</span>
          <input v-model="douyinSigner" placeholder="http://127.0.0.1:18080" maxlength="512" spellcheck="false" />
        </label>
      </div>

      <p class="signer-note">
        抖音 webcast 需要短期签名 URL；本应用不内置签名算法，请配置自建或本地签名服务。
      </p>


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
        <div class="card-controls">
          <StatusPill v-if="mock" :phase="mock.status.phase" />
          <ToggleSwitch
            v-model="mockEnabled"
            label="启用本地模拟源"
            @update:modelValue="setMockEnabled"
          />
        </div>
      </header>

      <p v-if="mock?.status.detail" class="detail" :class="mock.status.phase">
        {{ mock.status.detail }}
      </p>

      <div class="form mock-form">
        <div class="switch-stack">
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
        <div class="mock-limits">
          <label class="field compact">
            <span>用户数量</span>
            <div class="unit">
              <input v-model.number="userCount" type="number" min="1" max="100" />
              <em>人</em>
            </div>
          </label>
          <label class="field compact">
            <span>发送间隔</span>
            <div class="unit">
              <input v-model.number="botsInterval" type="number" min="1" max="60" />
              <em>秒</em>
            </div>
          </label>
        </div>
      </div>


    </section>
  </div>
</template>

<style scoped>
.platforms {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--s-4);
  width: 100%;
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


.card-controls {
  display: flex;
  align-items: center;
  gap: var(--s-2);
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

.icon.douyin {
  color: var(--ink);
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
  font-size: 12px;
}

.signer-note {
  margin: 0;
  color: var(--faint);
  font-size: 12px;
  line-height: 16px;
}

.detail {
  margin: 0;
  padding: var(--s-2) var(--s-3);
  border-left: 2px solid var(--hairline-strong);
  border-radius: 4px;
  background: var(--surface-active);
  color: var(--mute);
  font-size: 12px;
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

.mock-form {
  flex-direction: column;
  align-items: stretch;
}

.mock-limits {
  display: flex;
  gap: var(--s-4);
}

.douyin-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.douyin-form .switch-row {
  grid-column: 1 / -1;
  margin-top: var(--s-2);
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
  font-size: 13px;
  font-weight: 500;
}

.switch-row span {
  color: var(--mute);
  font-size: 12px;
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
  font-size: 12px;
}

.field.compact {
  flex: 0 0 112px;
}

.field input:focus {
  border-color: var(--accent);
  outline: none;
}

.field input {
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 13px;
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
  font-size: 12px;
  font-style: normal;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  color: var(--body);
  font-size: 13px;
  white-space: nowrap;
}

.check input {
  accent-color: var(--accent);
}

.card:last-child {
  grid-column: 1 / -1;
}

@media (max-width: 1100px) {
  .platforms {
    grid-template-columns: minmax(0, 1fr);
  }

  .card:last-child {
    grid-column: auto;
  }
}
</style>
