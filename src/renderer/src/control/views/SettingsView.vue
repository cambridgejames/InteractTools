<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { FeedMode } from '@contracts/config'
import type { NetworkTestResult, ProxyMode } from '@contracts/network'
import type { WindowDisplayOption } from '@contracts/ipc'
import AppIcon from '../components/AppIcon.vue'
import AppSelect from '../components/AppSelect.vue'
import PlatformsView from './PlatformsView.vue'
import { actions, showToast, state } from '../store'

const GITHUB_URL = 'https://github.com/cambridgejames/InteractTools'
const GITHUB_ISSUES_URL = GITHUB_URL + '/issues'

type SettingsSection = 'platforms' | 'network' | 'interface' | 'data' | 'about'

const section = ref<SettingsSection>('platforms')
const sections: Array<{
  id: SettingsSection
  label: string
  icon: 'platforms' | 'globe' | 'settings' | 'folder' | 'users'
}> = [
  { id: 'platforms', label: '平台连接', icon: 'platforms' },
  { id: 'network', label: '网络', icon: 'globe' },
  { id: 'interface', label: '界面与窗口', icon: 'settings' },
  { id: 'data', label: '数据', icon: 'folder' },
  { id: 'about', label: '关于', icon: 'users' }
]

const displays = ref<readonly WindowDisplayOption[]>([])
const selectedDisplay = ref('cursor')
const selectedFeedMode = ref<FeedMode>('full')
const proxyMode = ref<ProxyMode>('none')
const proxyUrl = ref('')
const testing = ref(false)
const testResult = ref<NetworkTestResult | null>(null)
const proxyOptions = [
  { value: 'none', label: '不使用代理' },
  { value: 'system', label: '使用系统代理' },
  { value: 'custom', label: '自定义代理' }
]
const displayOptions = computed(() => [
  { value: 'cursor', label: '跟随鼠标' },
  { value: 'primary', label: '主显示器' },
  ...displays.value.map((display) => ({
    value: display.id,
    label:
      display.label +
      (display.primary ? ' · 主屏' : '') +
      ' · ' +
      String(display.width) +
      '×' +
      String(display.height)
  }))
])
const feedOptions = [
  { value: 'full', label: '完整显示' },
  { value: 'collapsed', label: '折叠成窄条' },
  { value: 'hidden', label: '隐藏' }
]

onMounted(async () => {
  selectedDisplay.value = state.snapshot?.window.display ?? 'cursor'
  selectedFeedMode.value = state.snapshot?.feedMode ?? 'full'
  proxyMode.value = state.snapshot?.network.proxyMode ?? 'none'
  proxyUrl.value = state.snapshot?.network.proxyUrl ?? ''
  try {
    displays.value = await window.api.windowDisplays()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '读取显示器失败', 'error')
  }
})

async function chooseDisplay(value: string): Promise<void> {
  selectedDisplay.value = value
  await saveDisplay()
}

async function chooseFeedMode(value: string): Promise<void> {
  if (value !== 'full' && value !== 'collapsed' && value !== 'hidden') return
  selectedFeedMode.value = value
  await saveFeedMode()
}

async function saveDisplay(): Promise<void> {
  try {
    await window.api.setWindowDisplay(selectedDisplay.value)
    showToast('窗口位置已更新', 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '更新窗口位置失败', 'error')
  }
}

async function saveFeedMode(): Promise<void> {
  try {
    await window.api.setFeedMode(selectedFeedMode.value)
    showToast('弹幕栏设置已更新', 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '更新弹幕栏失败', 'error')
  }
}

async function chooseProxyMode(value: string): Promise<void> {
  if (value !== 'none' && value !== 'system' && value !== 'custom') return
  proxyMode.value = value
  testResult.value = null
  try {
    await window.api.updateNetworkConfig({ proxyMode: value })
    showToast('网络代理已更新', 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '更新网络代理失败', 'error')
  }
}

async function saveProxyUrl(): Promise<void> {
  if (proxyMode.value !== 'custom') return
  try {
    await window.api.updateNetworkConfig({ proxyUrl: proxyUrl.value })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '保存代理地址失败', 'error')
  }
}

async function testNetwork(): Promise<void> {
  testing.value = true
  testResult.value = null
  try {
    await window.api.updateNetworkConfig({ proxyMode: proxyMode.value, proxyUrl: proxyUrl.value })
    testResult.value = await window.api.testNetwork()
    showToast(testResult.value.ok ? '网络连通正常' : '网络连接失败', testResult.value.ok ? 'success' : 'error')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '测试网络失败', 'error')
  } finally {
    testing.value = false
  }
}

async function openExternal(url: string): Promise<void> {
  try {
    await window.api.openExternal(url)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开链接失败', 'error')
  }
}

async function clearAllData(): Promise<void> {
  try {
    await window.api.clearAllData()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '清除数据失败', 'error')
  }
}
</script>

<template>
  <div class="settings-shell">
    <nav class="settings-nav" aria-label="设置分类">
      <button
        v-for="item in sections"
        :key="item.id"
        class="nav-item"
        :class="{ active: section === item.id }"
        :aria-current="section === item.id ? 'page' : undefined"
        @click="section = item.id"
      >
        <AppIcon :name="item.icon" :size="15" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="settings-content">
      <PlatformsView v-if="section === 'platforms'" />

      <section v-else-if="section === 'network'" class="card">
        <header>
          <h2>网络代理</h2>
          <p>部分网络环境需要代理才能连接 B站或抖音；修改后会重连平台。</p>
        </header>

        <label class="field">
          <span>代理方式</span>
          <AppSelect
            :model-value="proxyMode"
            :options="proxyOptions"
            label="选择代理方式"
            @update:model-value="chooseProxyMode"
          />
        </label>

        <label v-if="proxyMode === 'custom'" class="field">
          <span>代理地址</span>
          <input
            v-model="proxyUrl"
            class="text-input"
            placeholder="http://127.0.0.1:7890"
            spellcheck="false"
            @blur="saveProxyUrl"
          />
        </label>

        <div class="network-actions">
          <button class="secondary" :disabled="testing" @click="testNetwork">
            <AppIcon name="refresh" :size="15" />
            {{ testing ? '测试中…' : '测试连通性' }}
          </button>
          <span v-if="testResult" class="network-result" :class="{ ok: testResult.ok }">
            {{ testResult.ok ? '连通' : '失败' }} · {{ testResult.latencyMs }}ms
          </span>
        </div>
        <p v-if="testResult" class="network-detail" :class="{ ok: testResult.ok }">
          {{ testResult.message }}
        </p>
        <p v-else class="network-note">测试会请求 B站房间接口，耗时通常不超过 8 秒。</p>
      </section>

      <template v-else-if="section === 'interface'">
        <section class="card">
          <header>
            <h2>窗口位置</h2>
            <p>控制台启动时放在哪块屏幕；选择后立即移动。</p>
          </header>

          <label class="field">
            <span>显示器</span>
            <AppSelect
              :model-value="selectedDisplay"
              :options="displayOptions"
              label="选择显示器"
              @update:model-value="chooseDisplay"
            />
          </label>
        </section>

        <section class="card">
          <header>
            <h2>界面</h2>
            <p>右侧弹幕栏可以折叠或隐藏；使用自己的弹幕机时选「隐藏」。</p>
          </header>

          <label class="field">
            <span>直播间弹幕栏</span>
            <AppSelect
              :model-value="selectedFeedMode"
              :options="feedOptions"
              label="选择弹幕栏模式"
              @update:model-value="chooseFeedMode"
            />
          </label>
        </section>

        <section class="card">
          <header>
            <h2>结果展示</h2>
            <p>动画在工具面板内播放，停稳后用应用内结果弹窗展示，带彩带烟花。</p>
          </header>

          <div class="row">
            <div>
              <strong>关闭方式</strong>
              <span>结果弹窗右上角、遮罩或 Esc。</span>
            </div>
          </div>

          <button class="secondary" @click="actions.previewActiveTool()">
            <AppIcon name="eye" :size="15" />
            预览结果动画
          </button>
        </section>
      </template>

      <section v-else-if="section === 'data'" class="card">
        <header>
          <h2>数据</h2>
          <p>配置、历史与日志都保存在本机用户目录。</p>
        </header>
        <div class="data-actions">
          <button class="secondary" @click="actions.openDataFolder()">
            <AppIcon name="folder" :size="15" />
            打开数据目录
          </button>
          <button class="danger" @click="clearAllData">清除所有数据…</button>
        </div>
        <p class="data-note">清除会删除配置、工具历史和日志，并重新启动应用。</p>
      </section>

      <section v-else class="card about">
        <header>
          <h2>关于</h2>
          <p>互动工坊 v0.1.0</p>
        </header>
        <ul>
          <li>本地优先：B站匿名弹幕、抖音只读弹幕 + 本地模拟，不依赖自建服务端。</li>
          <li>物理结果由 cannon-es 刚体模拟产生，结果动画只回放录制数据。</li>
          <li>视觉规格见 DESIGN.md，组件只使用 tokens.css 的变量。</li>
        </ul>
        <div class="links">
          <button class="link" @click="openExternal(GITHUB_URL)">
            <AppIcon name="external" :size="14" />
            GitHub 仓库
          </button>
          <button class="link" @click="openExternal(GITHUB_ISSUES_URL)">问题反馈</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  align-items: start;
  gap: var(--s-5);
  max-width: 1080px;
  margin: 0 auto;
}

.settings-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--canvas-elevated);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 36px;
  padding: 0 var(--s-3);
  border: 0;
  border-radius: var(--r-control);
  background: transparent;
  color: var(--mute);
  font-size: 12px;
  text-align: left;
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.nav-item.active {
  background: var(--surface-active);
  color: var(--ink);
}

.nav-item.active :deep(svg) {
  color: var(--accent);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
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

header h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

header p {
  margin: 2px 0 0;
  color: var(--mute);
  font-size: 11px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 11px;
}

.text-input {
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 12px;
}

.text-input:focus {
  border-color: var(--accent);
  outline: none;
}

.network-actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.network-result {
  color: var(--danger);
  font-family: var(--font-mono);
  font-size: 11px;
}

.network-result.ok {
  color: var(--success);
}

.network-detail,
.network-note {
  margin: 0;
  color: var(--mute);
  font-size: 10px;
  overflow-wrap: anywhere;
}

.network-detail.ok {
  color: var(--success);
}

.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.secondary {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--body);
  font-size: 12px;
}

.secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.danger {
  height: 34px;
  padding: 0 var(--s-3);
  border: 1px solid color-mix(in srgb, var(--danger) 45%, var(--hairline));
  border-radius: var(--r-control);
  background: transparent;
  color: var(--danger);
  font-size: 12px;
}

.danger:hover {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

.data-note {
  margin: 0;
  color: var(--faint);
  font-size: 10px;
}

.links {
  display: flex;
  gap: var(--s-2);
  margin-top: var(--s-2);
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--body);
  font-size: 11px;
}

.link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) 0;
  border-top: 1px solid var(--hairline);
}

.row div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row strong {
  color: var(--body);
  font-size: 12px;
  font-weight: 500;
}

.row span {
  color: var(--faint);
  font-size: 11px;
}

.about ul {
  margin: 0;
  padding-left: 18px;
  color: var(--mute);
  font-size: 11px;
  line-height: 19px;
}

@media (max-width: 900px) {
  .settings-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
