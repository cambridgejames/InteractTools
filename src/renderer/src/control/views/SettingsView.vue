<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_SHORTCUTS, DEFAULT_UI_CONFIG, type FeedMode, type ShortcutAction, type ShortcutsConfig, type ThemeMode } from '@contracts/config'
import type { NetworkTestResult, ProxyMode } from '@contracts/network'
import type { WindowDisplayOption } from '@contracts/ipc'
import AppIcon from '../components/AppIcon.vue'
import AppSelect from '../components/AppSelect.vue'
import PlatformGlyph from '../components/PlatformGlyph.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import PlatformsView from './PlatformsView.vue'
import { actions, showToast, state } from '../store'

const changelogEntries = ref<string[]>([])

const GITHUB_URL = 'https://github.com/cambridgejames/InteractTools'
const GITHUB_ISSUES_URL = GITHUB_URL + '/issues'

type SettingsSection = 'platforms' | 'network' | 'appearance' | 'window' | 'shortcuts' | 'data' | 'about'

const section = ref<SettingsSection>('platforms')
const sections: Array<{
  id: SettingsSection
  label: string
  icon: 'platforms' | 'globe' | 'settings' | 'dashboard' | 'keyboard' | 'folder' | 'users'
}> = [
  { id: 'platforms', label: '平台连接', icon: 'platforms' },
  { id: 'network', label: '网络', icon: 'globe' },
  { id: 'appearance', label: '外观', icon: 'settings' },
  { id: 'window', label: '窗口', icon: 'dashboard' },
  { id: 'shortcuts', label: '快捷键', icon: 'keyboard' },
  { id: 'data', label: '数据', icon: 'folder' },
  { id: 'about', label: '关于', icon: 'users' }
]

const displays = ref<readonly WindowDisplayOption[]>([])
const selectedDisplay = ref('cursor')
const selectedFeedMode = ref<FeedMode>('full')
const ui = computed(() => state.snapshot?.ui ?? DEFAULT_UI_CONFIG)
const update = computed(() => state.update)
const updatePrefs = computed(() => state.snapshot?.updates ?? { autoCheck: true, autoDownload: false })
const updateStatus = computed(() => {
  switch (update.value?.phase) {
    case 'checking': return '正在检查更新…'
    case 'available': return '发现新版本 v' + (update.value.latestVersion ?? '')
    case 'downloading': return '正在下载 ' + String(update.value.progress ?? 0) + '%'
    case 'downloaded': return '更新已下载，重启后安装'
    case 'not-available': return '已是最新版本'
    case 'error': return update.value.message ?? '检查更新失败'
    default: return '尚未检查'
  }
})
const proxyMode = ref<ProxyMode>('none')
const proxyUrl = ref('')
const proxyUsername = ref('')
const proxyPassword = ref('')
const proxyBypass = ref('')
const allowInsecureTls = ref(false)
const testing = ref(false)
const logLevel = ref<'debug' | 'info' | 'warn' | 'error'>('info')
const logLevelOptions = [
  { value: 'debug', label: 'Debug（最详细，日志增长快）' },
  { value: 'info', label: 'Info（推荐）' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error（只记错误）' }
]
const testResult = ref<NetworkTestResult | null>(null)
const probeResults = computed(() => (testResult.value?.platforms ?? []).filter((probe) => probe.platformId !== 'mock'))
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
const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: '深色（默认）' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' }
]
const feedOptions = [
  { value: 'full', label: '完整显示' },
  { value: 'collapsed', label: '折叠成窄条' },
  { value: 'hidden', label: '隐藏' }
]
const shortcutRows: Array<{
  id: ShortcutAction
  label: string
  description: string
  icon: 'eye' | 'platforms' | 'close' | 'settings'
}> = [
  { id: 'toggleWindow', label: '显示 / 隐藏窗口', description: '直播时快速收起或叫回控制台。', icon: 'eye' },
  { id: 'toggleFeed', label: '显示 / 隐藏弹幕栏', description: '在全屏和隐藏之间切换右侧弹幕。', icon: 'platforms' },
  { id: 'clearFeed', label: '清空弹幕', description: '清空当前消息和进场 ticker，不删除历史记录。', icon: 'close' },
  { id: 'openSettings', label: '打开设置', description: '叫回窗口并直接切换到设置页。', icon: 'settings' }
]

function bindingOf(action: ShortcutAction): ShortcutsConfig[ShortcutAction] {
  return state.snapshot?.shortcuts?.[action] ?? DEFAULT_SHORTCUTS[action]
}

async function saveShortcut(action: ShortcutAction, patch: Partial<ShortcutsConfig[ShortcutAction]>): Promise<void> {
  const shortcuts = state.snapshot?.shortcuts
  if (shortcuts === undefined) return
  const next: ShortcutsConfig = {
    ...shortcuts,
    [action]: { ...shortcuts[action], ...patch }
  }
  if (await actions.updateShortcuts(next)) showToast('快捷键已更新', 'success')
}

async function clearShortcut(action: ShortcutAction): Promise<void> {
  await saveShortcut(action, { accelerator: '', global: false })
}

async function resetShortcuts(): Promise<void> {
  if (await actions.updateShortcuts(DEFAULT_SHORTCUTS)) showToast('快捷键已清空', 'success')
}

async function setShortcutGlobal(action: ShortcutAction, value: boolean): Promise<void> {
  await saveShortcut(action, { global: value })
}

function keyName(event: KeyboardEvent): string | null {
  const code = event.code
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  const special: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Escape',
    Enter: 'Return',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown'
  }
  return special[event.key] ?? null
}

async function recordShortcut(event: KeyboardEvent, action: ShortcutAction): Promise<void> {
  event.preventDefault()
  if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'Delete') {
    await clearShortcut(action)
    return
  }

  const key = keyName(event)
  if (key === null) return
  const modifiers: string[] = []
  if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (modifiers.length === 0) {
    showToast('快捷键至少需要一个 Ctrl、Alt 或 Shift 修饰键', 'error')
    return
  }

  const accelerator = [...modifiers, key].join('+')
  if (/^(?:CommandOrControl|Control|Command|Alt)\+(?:W|Q|F4)$/i.test(accelerator)) {
    showToast('关闭/退出组合不能绑定', 'error')
    return
  }
  await saveShortcut(action, { accelerator })
}

onMounted(async () => {
  selectedDisplay.value = state.snapshot?.window.display ?? 'cursor'
  selectedFeedMode.value = state.snapshot?.feedMode ?? 'full'
  proxyMode.value = state.snapshot?.network.proxyMode ?? 'none'
  proxyUrl.value = state.snapshot?.network.proxyUrl ?? ''
  proxyUsername.value = state.snapshot?.network.proxyUsername ?? ''
  proxyPassword.value = state.snapshot?.network.proxyPassword ?? ''
  proxyBypass.value = state.snapshot?.network.proxyBypass ?? ''
  allowInsecureTls.value = state.snapshot?.network.allowInsecureTls ?? false
  logLevel.value = state.snapshot?.logging.level ?? 'info'
  try {
    changelogEntries.value = [...(await window.api.getChangelog())]
  } catch {
    changelogEntries.value = []
  }
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

async function setUi(patch: Partial<typeof DEFAULT_UI_CONFIG>): Promise<void> {
  await actions.updateUi(patch)
}

async function chooseTheme(value: string): Promise<void> {
  if (value !== 'dark' && value !== 'light' && value !== 'system') return
  await setUi({ theme: value })
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
    await window.api.updateNetworkConfig({
      proxyUrl: proxyUrl.value,
      proxyUsername: proxyUsername.value,
      proxyPassword: proxyPassword.value,
      proxyBypass: proxyBypass.value
    })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '保存代理地址失败', 'error')
  }
}

async function saveProxyExtras(): Promise<void> {
  try {
    await window.api.updateNetworkConfig({
      proxyUsername: proxyUsername.value,
      proxyPassword: proxyPassword.value,
      proxyBypass: proxyBypass.value
    })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '保存代理设置失败', 'error')
  }
}

async function chooseLogLevel(value: string): Promise<void> {
  if (value !== 'debug' && value !== 'info' && value !== 'warn' && value !== 'error') return
  logLevel.value = value
  await actions.updateLogging(value)
}

async function setUpdatePrefs(patch: { autoCheck?: boolean; autoDownload?: boolean }): Promise<void> {
  await actions.setUpdatePrefs(patch)
}

async function setInsecureTls(value: boolean): Promise<void> {
  allowInsecureTls.value = value
  try {
    await window.api.updateNetworkConfig({ allowInsecureTls: value })
  } catch (error) {
    allowInsecureTls.value = !value
    showToast(error instanceof Error ? error.message : '更新 TLS 设置失败', 'error')
  }
}

async function testNetwork(): Promise<void> {
  testing.value = true
  testResult.value = null
  try {
    await window.api.updateNetworkConfig({
      proxyMode: proxyMode.value,
      proxyUrl: proxyUrl.value,
      proxyUsername: proxyUsername.value,
      proxyPassword: proxyPassword.value,
      proxyBypass: proxyBypass.value,
      allowInsecureTls: allowInsecureTls.value
    })
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
    <nav class="settings-tabs" aria-label="设置分类">
      <button
        v-for="item in sections"
        :key="item.id"
        class="nav-item"
        :class="{ active: section === item.id }"
        :data-tour="'settings-' + item.id"
        :aria-current="section === item.id ? 'page' : undefined"
        @click="section = item.id"
      >
        <AppIcon :name="item.icon" :size="15" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="settings-content">
      <template v-if="section === 'platforms'">
        <header class="section-head">
          <h2>平台连接</h2>
          <p>连接弹幕来源。所有平台只读；平台名称不会出现在实时弹幕和未激活状态里。</p>
        </header>
        <PlatformsView />
      </template>

      <template v-else-if="section === 'network'">
        <header class="section-head">
          <h2>网络</h2>
          <p>代理只影响平台连接；默认不使用代理。</p>
        </header>
        <section class="card">
          <header>
            <h2>连接方式</h2>
            <p>代理只影响平台连接；默认直连。</p>
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

        <template v-if="proxyMode === 'custom'">
          <label class="field">
            <span>代理地址</span>
            <input
              v-model="proxyUrl"
              class="text-input"
              placeholder="http://127.0.0.1:7890"
              spellcheck="false"
              @blur="saveProxyUrl"
            />
          </label>

          <div class="network-grid">
            <label class="field">
              <span>用户名</span>
              <input
                v-model="proxyUsername"
                class="text-input"
                autocomplete="off"
                spellcheck="false"
                @blur="saveProxyExtras"
              />
            </label>
            <label class="field">
              <span>密码</span>
              <input
                v-model="proxyPassword"
                class="text-input"
                type="password"
                autocomplete="new-password"
                @blur="saveProxyExtras"
              />
            </label>
          </div>
        </template>

        <label v-if="proxyMode !== 'none'" class="field">
          <span>直连域名</span>
          <input
            v-model="proxyBypass"
            class="text-input"
            placeholder="localhost, 127.0.0.1, .internal.example.com"
            spellcheck="false"
            @blur="saveProxyExtras"
          />
        </label>

        <div v-if="proxyMode !== 'none'" class="switch-row network-switch">
          <div>
            <strong>跳过 SSL 证书校验</strong>
            <span>仅用于内网自签名代理；开启后平台请求不再验证证书。</span>
          </div>
          <ToggleSwitch
            :model-value="allowInsecureTls"
            label="跳过 SSL 证书校验"
            @update:model-value="setInsecureTls"
          />
        </div>

        <div class="network-actions">
          <button class="secondary" data-tour="network-test" :disabled="testing" @click="testNetwork">
            <AppIcon name="refresh" :size="15" />
            {{ testing ? '测试中…' : '测试连通性' }}
          </button>
          <span v-if="testResult" class="network-note">
            {{ testResult.message }}
          </span>
        </div>

        <div v-if="testResult" class="network-probes">
          <div
            v-for="probe in probeResults"
            :key="probe.platformId"
            class="network-probe"
            :class="{ ok: probe.ok }"
          >
            <PlatformGlyph :id="probe.platformId" :size="30" :active="probe.ok" />
            <div class="network-probe-copy">
              <strong>{{ probe.name }}</strong>
              <span>{{ probe.ok ? '连通' : probe.message }}</span>
            </div>
            <span class="network-probe-latency">{{ probe.ok ? probe.latencyMs + 'ms' : '失败' }}</span>
          </div>
        </div>
        <p v-else class="network-note">测试会分别请求已注册平台的公开接口；新增平台实现 probe 后会自动加入。</p>
        </section>
      </template>

      <template v-else-if="section === 'window'">
        <header class="section-head">
          <h2>窗口</h2>
          <p>控制台启动时放在哪块屏幕；选择后立即移动。</p>
        </header>
        <section class="card">
          <header>
            <h2>窗口位置</h2>
            <p>多屏直播时把控制台固定到主屏或跟随鼠标。</p>
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
      </template>

      <template v-else-if="section === 'appearance'">
        <header class="section-head">
          <h2>外观</h2>
          <p>主题、弹幕栏、平台标签和结果展示。</p>
        </header>
        <section class="card">
          <header>
            <h2>主题</h2>
            <p>默认深色；跟随系统会随系统外观实时切换，窗口按钮也会同步。</p>
          </header>

          <label class="field">
            <span>外观</span>
            <AppSelect
              :model-value="ui.theme"
              :options="themeOptions"
              label="选择主题"
              @update:model-value="chooseTheme"
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
            <h2>平台显示</h2>
            <p>控制平台名称出现的位置；本地模拟可以独立于真实平台显示。</p>
          </header>

          <div class="setting-switch">
            <div>
              <strong>顶部显示正在连接的平台</strong>
              <span>只显示已连接、连接中或重连中的平台。</span>
            </div>
            <ToggleSwitch
              :model-value="ui.showActivePlatforms"
              label="顶部显示正在连接的平台"
              @update:model-value="setUi({ showActivePlatforms: $event })"
            />
          </div>

          <div class="setting-switch">
            <div>
              <strong>弹幕显示来源平台</strong>
              <span>在真实平台弹幕旁显示 B站 / 抖音标签。</span>
            </div>
            <ToggleSwitch
              :model-value="ui.showFeedPlatforms"
              label="弹幕显示来源平台"
              @update:model-value="setUi({ showFeedPlatforms: $event })"
            />
          </div>

          <div class="setting-switch">
            <div>
              <strong>显示本地模拟标签</strong>
              <span>模拟观众独立显示「模拟」，不受真实平台标签开关影响。</span>
            </div>
            <ToggleSwitch
              :model-value="ui.showMockLabel"
              label="显示本地模拟标签"
              @update:model-value="setUi({ showMockLabel: $event })"
            />
          </div>
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

      <template v-else-if="section === 'shortcuts'">
        <header class="section-head">
          <h2>快捷键</h2>
          <p>默认全部为空。点击按键框后按下组合键；Escape 或 Backspace 清除。</p>
        </header>

        <section class="card">
          <header>
            <h2>按键绑定</h2>
            <p>点击按键框后按下组合键；每项可以单独设为全局。</p>
          </header>

          <div v-for="row in shortcutRows" :key="row.id" class="shortcut-row">
            <div class="shortcut-info">
              <span class="shortcut-icon"><AppIcon :name="row.icon" :size="15" /></span>
              <div>
                <strong>{{ row.label }}</strong>
                <span>{{ row.description }}</span>
              </div>
            </div>
            <div class="shortcut-controls">
              <input
                class="shortcut-input"
                :value="bindingOf(row.id).accelerator || '未设置'"
                readonly
                aria-label="快捷键"
                @keydown.prevent="recordShortcut($event, row.id)"
              />
              <label class="shortcut-global">
                <span>全局</span>
                <ToggleSwitch
                  :model-value="bindingOf(row.id).global"
                  :disabled="bindingOf(row.id).accelerator.length === 0"
                  label="全局生效"
                  @update:model-value="setShortcutGlobal(row.id, $event)"
                />
              </label>
              <button
                class="shortcut-clear"
                type="button"
                :disabled="bindingOf(row.id).accelerator.length === 0"
                @click="clearShortcut(row.id)"
              >
                清除
              </button>
            </div>
          </div>

          <div class="shortcut-footer">
            <span>全局快捷键在应用隐藏或失焦时仍然生效；关闭/退出组合固定不可绑定。</span>
            <button class="shortcut-reset" type="button" @click="resetShortcuts">全部清空</button>
          </div>
        </section>
      </template>

      <template v-else-if="section === 'data'">
        <header class="section-head">
          <h2>数据</h2>
          <p>配置、历史与日志都保存在本机用户目录。</p>
        </header>
        <section class="card">
          <header>
            <h2>存储</h2>
            <p>配置、历史与日志都在本机用户目录。</p>
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

        <section class="card">
          <header>
            <h2>日志</h2>
            <p>按天 + 20MB 分文件，历史压缩，最多保留 20 个；日志留在本机。</p>
          </header>

          <label class="field">
            <span>日志等级</span>
            <AppSelect
              :model-value="logLevel"
              :options="logLevelOptions"
              label="选择日志等级"
              @update:model-value="chooseLogLevel"
            />
          </label>
          <p class="data-note warn-note">除非排查问题，不要改成 Debug；它会显著增加日志体积。</p>

          <div class="data-actions">
            <button class="secondary" @click="actions.collectLogs()">
              <AppIcon name="folder" :size="15" />
              收集日志
            </button>
          </div>
          <p class="data-note">收集会打包当前日志并打开所在文件夹，可直接附到问题反馈里。</p>
        </section>
      </template>

      <template v-else>
        <header class="section-head">
          <h2>关于</h2>
          <p>互动工坊 v{{ update?.currentVersion ?? '—' }}</p>
        </header>

        <section class="card">
          <header>
            <h2>更新</h2>
            <p>检查 GitHub Release 最新版本，与当前安装版本比较。</p>
          </header>

          <div class="update-summary">
            <div>
              <strong>当前版本 v{{ update?.currentVersion ?? '—' }}</strong>
              <span>{{ updateStatus }}</span>
            </div>
            <span class="update-chip" :class="'is-' + (update?.phase ?? 'idle')">
              {{ update?.phase === 'available' ? '可更新' : update?.phase === 'not-available' ? '最新' : '检查' }}
            </span>
          </div>

          <div class="data-actions">
            <button class="secondary" :disabled="update?.phase === 'checking'" @click="actions.checkUpdates">
              <AppIcon name="refresh" :size="15" />
              检查更新
            </button>
            <button v-if="update?.phase === 'available'" class="secondary" @click="actions.downloadUpdate">下载更新</button>
            <button v-if="update?.phase === 'downloaded'" class="secondary" @click="actions.installUpdate">重启安装</button>
            <button v-if="update?.releaseUrl" class="link" @click="actions.openUpdate">打开发布页</button>
          </div>

          <div class="setting-switch">
            <div>
              <strong>自动检查更新</strong>
              <span>启动后静默检查 GitHub Release；发现新版本时在顶部提示。</span>
            </div>
            <ToggleSwitch
              :model-value="updatePrefs.autoCheck"
              label="自动检查更新"
              @update:model-value="setUpdatePrefs({ autoCheck: $event })"
            />
          </div>
          <div class="setting-switch">
            <div>
              <strong>自动下载更新包</strong>
              <span>默认关闭；开启后发现新版本会自动下载，安装仍由你确认。</span>
            </div>
            <ToggleSwitch
              :model-value="updatePrefs.autoDownload"
              label="自动下载更新包"
              @update:model-value="setUpdatePrefs({ autoDownload: $event })"
            />
          </div>
        </section>

        <section class="card">
          <header>
            <h2>操作指引</h2>
            <p>第一次开播的流程：接平台、选玩法、看弹幕、绑快捷键。</p>
          </header>
          <div class="data-actions">
            <button class="secondary" @click="actions.openTour">重新播放操作指引</button>
          </div>
        </section>

        <section v-if="changelogEntries.length > 0" class="card">
          <header>
            <h2>最近更新</h2>
            <p>来自 CHANGELOG.md 的未发布条目。</p>
          </header>
          <ul class="about-changelog-list">
            <li v-for="entry in changelogEntries" :key="entry">{{ entry }}</li>
          </ul>
        </section>

        <section class="card">
          <header>
            <h2>链接</h2>
            <p>问题反馈请附带设置 → 数据 → 收集日志生成的 zip。</p>
          </header>
          <div class="links">
            <button class="link" @click="openExternal(GITHUB_URL)">
              <AppIcon name="external" :size="14" />
              GitHub 仓库
            </button>
            <button class="link" @click="openExternal(GITHUB_ISSUES_URL)">问题反馈</button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
}

.settings-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-card);
  background: var(--canvas-elevated);
  overflow-x: auto;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 34px;
  padding: 0 var(--s-3);
  border: 0;
  border-radius: var(--r-control);
  background: transparent;
  color: var(--mute);
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--body);
}

.nav-item.active {
  background: var(--surface-active);
  box-shadow: inset 0 -2px 0 var(--accent);
  color: var(--ink);
}

.nav-item.active :deep(svg) {
  color: var(--accent);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  width: 100%;
  max-width: none;
  min-width: 0;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 2px;
}

.section-head h2 {
  margin: 0;
  color: var(--ink);
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.4px;
}

.section-head p {
  margin: 0;
  color: var(--mute);
  font-size: 14px;
  line-height: 21px;
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
  font-size: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--mute);
  font-size: 12px;
}

.text-input {
  width: 100%;
  height: 36px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-size: 13px;
}

.text-input:focus {
  border-color: var(--accent);
  outline: none;
}

.setting-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) 0;
  border-top: 1px solid var(--hairline);
}

.setting-switch:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.setting-switch > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-switch strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.setting-switch span {
  color: var(--mute);
  font-size: 12px;
}

.network-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--s-3);
}

.network-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) 0;
  border-top: 1px solid var(--hairline);
}

.network-switch > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.network-switch strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.network-switch span {
  color: var(--mute);
  font-size: 12px;
}

.network-actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.network-note {
  margin: 0;
  color: var(--mute);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.network-probes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--s-2);
}

.network-probe {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  padding: var(--s-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
}

.network-probe.ok {
  border-color: color-mix(in srgb, var(--success) 35%, var(--hairline));
}

.network-probe-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.network-probe-copy strong {
  color: var(--body);
  font-size: 12px;
  font-weight: 500;
}

.network-probe-copy span {
  overflow: hidden;
  color: var(--mute);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.network-probe-latency {
  flex: none;
  color: var(--danger);
  font-family: var(--font-mono);
  font-size: 12px;
}

.network-probe.ok .network-probe-latency {
  color: var(--success);
}

.warn-note {
  color: var(--warning);
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
  font-size: 13px;
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
  font-size: 13px;
}

.danger:hover {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

.data-note {
  margin: 0;
  color: var(--faint);
  font-size: 12px;
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
  font-size: 12px;
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
  font-size: 13px;
  font-weight: 500;
}

.row span {
  color: var(--faint);
  font-size: 12px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--hairline);
}

.shortcut-row:first-child {
  padding-top: 0;
}

.shortcut-row:last-of-type {
  padding-bottom: 0;
  border-bottom: 0;
}

.shortcut-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--s-2);
}

.shortcut-info > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.shortcut-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: var(--r-icon);
  background: var(--surface-active);
  color: var(--mute);
}

.shortcut-info strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.shortcut-info > div > span {
  color: var(--mute);
  font-size: 12px;
}

.shortcut-controls {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex: none;
}

.shortcut-input {
  width: 168px;
  height: 34px;
  padding: 0 var(--s-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--body);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}

.shortcut-input:focus {
  border-color: var(--accent);
  outline: none;
}

.shortcut-global {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mute);
  font-size: 12px;
}

.shortcut-clear {
  height: 30px;
  padding: 0 var(--s-2);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--mute);
  font-size: 12px;
}

.shortcut-clear:hover:not(:disabled) {
  border-color: var(--hairline-strong);
  color: var(--body);
}

.shortcut-clear:disabled {
  opacity: 0.4;
}

.shortcut-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding-top: var(--s-3);
  color: var(--faint);
  font-size: 12px;
  line-height: 18px;
}

.shortcut-reset {
  flex: none;
  height: 30px;
  padding: 0 var(--s-3);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--body);
  font-size: 12px;
}

.shortcut-reset:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.update-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
}

.update-summary > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.update-summary strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.update-summary span {
  color: var(--mute);
  font-size: 12px;
}

.update-chip {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-chip);
  color: var(--mute);
  font-size: 12px;
}

.update-chip.is-available {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--hairline));
  background: var(--accent-soft);
  color: var(--accent);
}

.update-chip.is-error {
  border-color: color-mix(in srgb, var(--danger) 40%, var(--hairline));
  color: var(--danger);
}

.about-changelog-list {
  margin: 0;
  padding-left: 18px;
  color: var(--mute);
  font-size: 12px;
  line-height: 19px;
}

.about-replay {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  margin-top: var(--s-3);
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.about-replay > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-replay strong {
  color: var(--body);
  font-size: 13px;
  font-weight: 500;
}

.about-replay span {
  color: var(--mute);
  font-size: 12px;
}

.about ul {
  margin: 0;
  padding-left: 18px;
  color: var(--mute);
  font-size: 12px;
  line-height: 19px;
}

@media (max-width: 900px) {
  .settings-tabs {
    width: 100%;
  }

  .shortcut-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .shortcut-controls {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
