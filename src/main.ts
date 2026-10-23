
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/roboto-flex'

import './style.css'
import './plugins/m3e'
import App from './App.vue'
import { i18n } from './lib/i18n'

createApp(App)
  .use(createPinia())
  .use(i18n)
  .mount('#app')