
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { M3eSplitPaneElement } from '@m3e/web/split-pane'
import { META } from './services/registry'
import { useServices } from './stores/services'
import { useSnapshots } from './stores/snapshots'
import { useTabs } from './stores/tabs'
import { useUi } from './stores/ui'
import { locale } from './lib/i18n'
import { setStorageErrorReporter } from './lib/storage'
import TabSidebar from './components/TabSidebar.vue'
import Toolbar from './components/Toolbar.vue'
import TabContent from './components/TabContent.vue'
import RightPanel from './components/RightPanel.vue'
import ServiceModal from './components/ServiceModal.vue'
import Snackbar from './components/ui/Snackbar.vue'

const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()
const { t } = useI18n()
const splitPane = ref<M3eSplitPaneElement>()

const seed = computed(() =>
  ui.dynamicColor && tabs.activeService ? META[tabs.activeService.type].color : ui.seedColor,
)

function formatPanelSize(value: number) {
  return t('panel.resizeValue', {
    main: Math.round(value),
    details: Math.round(100 - value),
  })
}

watch(
  splitPane,
  (element) => {
    if (element) element.valueFormatter = formatPanelSize
  },
  { flush: 'post' },
)

function savePanelSize(event: Event) {
  const element = event.currentTarget
  if (
    !(element instanceof HTMLElement) ||
    !('value' in element) ||
    typeof element.value !== 'number'
  ) {
    return
  }

  tabs.setPanelSize(element.value)
}

watch(locale, (l) => {
  document.documentElement.lang = l
  snaps.refreshAll()
}, { immediate: true })

onMounted(async () => {
  setStorageErrorReporter((error) => ui.showToast(error.message, 'error'))
  try {
    await ui.load()
    await services.load()
    await tabs.restore()
    snaps.start()
  } catch (error) {
    console.error('Falha ao inicializar os dados locais', error)
    ui.showToast(t('err.storageRead'), 'error')
  }
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
  <m3e-theme
    :color="seed"
    :scheme="ui.mode"
    :style="{ colorScheme: ui.isDark ? 'dark' : 'light' }"
    variant="tonal-spot"
    motion="expressive"
    strong-focus
    class="contents"
  >
    <div class="flex h-full gap-3 bg-surface-container p-3 text-on-surface select-none">
      <TabSidebar />

      <m3e-split-pane
        ref="splitPane"
        class="min-h-0 min-w-0 flex-1"
        :value="tabs.panelSize"
        min="58"
        max="68"
        step="2"
        orientation="horizontal"
        :label="t('panel.resize')"
        style="
          --m3e-split-pane-drag-handle-container-width: 24px;
          --m3e-split-pane-drag-handle-width: 2px;
          --m3e-split-pane-drag-handle-height: 48px;
          --m3e-split-pane-drag-handle-pressed-width: 4px;
          --m3e-split-pane-drag-handle-pressed-height: 52px;
        "
        @change="savePanelSize"
      >
        <main
          slot="start"
          class="flex h-full min-h-0 min-w-0 flex-col gap-3"
        >
          <Toolbar />
          <TabContent />
        </main>

        <div
          slot="end"
          class="h-full min-h-0 min-w-0"
          :hidden="!tabs.panelOpen || !tabs.activeService"
        >
          <RightPanel />
        </div>
      </m3e-split-pane>
    </div>

    <ServiceModal />
    <Snackbar />
  </m3e-theme>
</template>
