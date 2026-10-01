import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/roboto-flex'
import './style.css'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
