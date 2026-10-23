<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { M3eSplitPaneElement } from '@m3e/web/split-pane'

import { META } from './services/registry'
import { locale } from './lib/i18n'
import { setStorageErrorReporter } from './lib/storage'

import { useServices } from './stores/services'
import { useSnapshots } from './stores/snapshots'
import { useTabs } from './stores/tabs'
import { useUi } from './stores/ui'

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
  ui.dynamicColor && tabs.activeService
    ? META[tabs.activeService.type].color
    : ui.seedColor,
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
    if (element) {
      element.valueFormatter = formatPanelSize
    }
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


watch(
  locale,
  (language) => {
    document.documentElement.lang = language
    snaps.refreshAll()
  },
  { immediate: true },
)

async function initializeApp() {
  setStorageErrorReporter((error) => {
    ui.showToast(error.message, 'error')
  })

  try {
    await ui.load()
    await services.load()
    await tabs.restore()

    snaps.start()
  } catch (error) {
    console.error('Falha ao inicializar os dados locais', error)
    ui.showToast(t('err.storageRead'), 'error')
  }
}

function onKey(event: KeyboardEvent) {
  const modifier = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  if (modifier && key === 't') {
    event.preventDefault()
    tabs.openNewTab()
  } else if (modifier && key === 'w') {
    event.preventDefault()
    tabs.close(tabs.activeId)
  } else if (modifier && key === 'b' && tabs.activeService) {
    event.preventDefault()
    tabs.togglePanel()
  } else if (modifier && (key === 'l' || key === 'k')) {
    event.preventDefault()
    ui.focusOmnibox()
  } else if (modifier && event.key === ',') {
    event.preventDefault()
    tabs.openSettings()
  } else if (event.altKey && event.key === 'ArrowLeft') {
    tabs.back()
  } else if (event.altKey && event.key === 'ArrowRight') {
    tabs.forward()
  }
}

onMounted(() => {
  void initializeApp()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
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
    <div
      class="flex h-full min-h-0 flex-col gap-3 bg-surface-container p-3 text-on-surface select-none"
    >
      <Toolbar />

      <div class="flex min-h-0 min-w-0 flex-1 gap-3">
        <TabSidebar />

        <m3e-split-pane
          ref="splitPane"
          class="min-h-0 min-w-0 flex-1"
          :value="tabs.panelSize"
          min="45"
          max="85"
          step="1"
          orientation="horizontal"
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
            class="flex h-full min-h-0 min-w-0 flex-col"
          >
            <TabContent />
          </main>

          <div
             slot="end"
             class="box-border h-full min-h-0 min-w-0 pt-4"
             :hidden="!tabs.panelOpen || !tabs.activeService"
           >
            <RightPanel />
          </div>
        </m3e-split-pane>
      </div>
    </div>

    <ServiceModal />
    <Snackbar />
  </m3e-theme>
</template>
