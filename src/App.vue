<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { META } from './services/registry'
import { useServices } from './stores/services'
import { useSnapshots } from './stores/snapshots'
import { useTabs } from './stores/tabs'
import { useUi } from './stores/ui'
import { applyTheme } from './lib/theme'
import { locale } from './lib/i18n'
import TabSidebar from './components/TabSidebar.vue'
import Toolbar from './components/Toolbar.vue'
import TabContent from './components/TabContent.vue'
import RightPanel from './components/RightPanel.vue'
import ServiceModal from './components/ServiceModal.vue'
import Snackbar from './components/Snackbar.vue'

const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

// Cor dinâmica: o app inteiro "tinge" conforme o serviço da aba ativa
const seed = computed(() =>
  ui.dynamicColor && tabs.activeService ? META[tabs.activeService.type].color : ui.seedColor,
)
watchEffect(() => applyTheme(seed.value, ui.isDark))

// Idioma: atualiza o atributo lang e rebusca os dados (os textos dos cards vêm dos adapters)
watch(locale, (l) => {
  document.documentElement.lang = l
  snaps.refreshAll()
}, { immediate: true })

onMounted(async () => {
  await ui.load()
  await services.load()
  await tabs.restore()
  snaps.start()
})

// Atalhos de navegador: Ctrl/Cmd+T nova aba, Ctrl/Cmd+W fecha, Ctrl/Cmd+B painel, Alt+setas
function onKey(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 't') { e.preventDefault(); tabs.openNewTab() }
  else if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); tabs.close(tabs.activeId) }
  else if (mod && e.key.toLowerCase() === 'b' && tabs.activeService) { e.preventDefault(); tabs.togglePanel() }
  else if (mod && (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'k')) { e.preventDefault(); ui.focusOmnibox() }
  else if (mod && e.key === ',') { e.preventDefault(); tabs.openSettings() }
  else if (e.altKey && e.key === 'ArrowLeft') tabs.back()
  else if (e.altKey && e.key === 'ArrowRight') tabs.forward()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex h-full gap-3 p-3 select-none">
    <TabSidebar />
    <main class="flex min-w-0 flex-1 flex-col gap-3">
      <Toolbar />
      <TabContent />
    </main>
    <RightPanel />
  </div>
  <ServiceModal />
  <Snackbar />
</template>
