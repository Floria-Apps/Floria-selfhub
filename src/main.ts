
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/roboto-flex'

import './style.css'
import App from './App.vue'
import { i18n } from './lib/i18n'
import { registerM3e } from './plugins/m3e'

async function bootstrap() {
  await registerM3e()

  createApp(App)
    .use(createPinia())
    .use(i18n)
    .mount('#app')
}

void bootstrap()