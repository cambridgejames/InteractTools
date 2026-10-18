<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import { actions } from '../store'
</script>

<template>
  <div class="settings">
    <section class="card">
      <header>
        <h2>结果展示</h2>
        <p>动画在工具面板内播放，停稳后用原生结果小窗展示，带彩带烟花。</p>
      </header>

      <div class="row">
        <div>
          <strong>关闭方式</strong>
          <span>结果小窗右上角关闭按钮，或按 Esc。</span>
        </div>
      </div>

      <button class="secondary" @click="actions.previewActiveTool()">
        <AppIcon name="eye" :size="15" />
        预览结果动画
      </button>
    </section>

    <section class="card">
      <header>
        <h2>数据</h2>
        <p>配置、历史与日志都保存在本机用户目录。</p>
      </header>
      <button class="secondary" @click="actions.openDataFolder()">
        <AppIcon name="folder" :size="15" />
        打开数据目录
      </button>
    </section>

    <section class="card about">
      <header>
        <h2>关于</h2>
        <p>1017 互动工坊 v0.1.0</p>
      </header>
      <ul>
        <li>本地优先：B站匿名弹幕 + 本地模拟，不依赖自建服务端。</li>
        <li>物理结果由 cannon-es 刚体模拟产生，结果动画只回放录制数据。</li>
        <li>视觉规格见 DESIGN.md，组件只使用 tokens.css 的变量。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  max-width: 720px;
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
  color: var(--mute);
  font-size: 11px;
}

.toggle {
  position: relative;
  width: 36px;
  height: 20px;
  flex: 0 0 36px;
  padding: 0;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-chip);
  background: var(--surface-active);
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.toggle i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mute);
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.toggle.on {
  border-color: var(--accent);
  background: var(--accent);
}

.toggle.on i {
  background: var(--accent-ink);
  transform: translateX(16px);
}

.unit {
  position: relative;
  width: 92px;
  flex: 0 0 92px;
}

.unit input {
  width: 100%;
  height: 34px;
  padding: 0 32px 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-control);
  background: var(--inset);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 12px;
}

.unit em {
  position: absolute;
  right: 10px;
  top: 8px;
  color: var(--faint);
  font-size: 11px;
  font-style: normal;
}

.secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  align-self: flex-start;
  height: 34px;
  padding: 0 var(--s-4);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-control);
  background: transparent;
  color: var(--body);
  font-size: 12px;
}

.secondary:hover {
  background: var(--surface-hover);
}

.about ul {
  margin: 0;
  padding-left: 18px;
  color: var(--mute);
  font-size: 12px;
  line-height: 20px;
}
</style>
