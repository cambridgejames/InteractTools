import { createApp } from 'vue'
import '../styles/tokens.css'
import '../styles/base.css'
import './result/result-popup.css'
import App from './App.vue'

const app = createApp(App)
app.config.errorHandler = (error, _instance, info) => {
  console.error('[renderer-error]', info, error)
}
window.addEventListener('error', (event) => {
  console.error('[renderer-error]', event.error ?? event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('[renderer-rejection]', event.reason)
})
app.mount('#app')
