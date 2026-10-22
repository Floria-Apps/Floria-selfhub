
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/roboto-flex'

import '@m3e/web/theme'
import '@m3e/web/button'
import '@m3e/web/icon-button'
import '@m3e/web/switch'
import '@m3e/web/segmented-button'
import '@m3e/web/icon'
import '@m3e/web/dialog'
import '@m3e/web/form-field'
import '@m3e/web/checkbox'
import '@m3e/web/card'
import '@m3e/web/search'
import '@m3e/web/snackbar'

import './style.css'
import App from './App.vue'

createApp(App)
  .use(createPinia())
  .mount('#app')