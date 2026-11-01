
<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
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
import Snackbar from './components/ui/Snackbar.vue'

const RightPanel = defineAsyncComponent(() => import('./components/RightPanel.vue'))
const ServiceModal = defineAsyncComponent(() => import('./components/ServiceModal.vue'))
const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

const { t } = useI18n()
const splitPane = ref<M3eSplitPaneElement>()
const serviceModalLoaded = ref(false)

watch(
  () => ui.modalOpen,
  (open) => {
    if (open) serviceModalLoaded.value = true
  },
)

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
    if (!element) return

    element.valueFormatter = formatPanelSize
    element.overshootLimit = 0
  },
  { flush: 'post' },
)

function fixSplitPaneSizing() {
  const pane = splitPane.value
  const shadowRoot = pane?.shadowRoot

  if (!pane || !shadowRoot) return

  const startPane = shadowRoot.querySelector<HTMLElement>('.start')
  const endPane = shadowRoot.querySelector<HTMLElement>('.end')

  startPane?.style.setProperty('min-width', '0', 'important')
  endPane?.style.setProperty('min-width', '0', 'important')
  endPane?.style.setProperty('flex-basis', '0', 'important')
}

function clampPanelDuringDrag(event: Event) {
  const pane = event.currentTarget as M3eSplitPaneElement
  const min = Number(pane.min)
  const max = Number(pane.max)
  const value = Math.max(min, Math.min(max, pane.value))

  if (value === pane.value) return

  pane.value = value
  pane.shadowRoot
    ?.querySelector<HTMLElement>('.base')
    ?.style.setProperty('--_split-pane-value', `${value}%`)
}

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

onMounted(async () => {
  void initializeApp()
  window.addEventListener('keydown', onKey)

  const pane = splitPane.value
  if (!pane) return

  await pane.updateComplete
  fixSplitPaneSizing()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <m3e-theme
    :color="seed"
    :scheme="ui.mode"
    :contrast="ui.contrast"
    :style="{ colorScheme: ui.isDark ? 'dark' : 'light' }"
    :variant="ui.themeVariant"
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
          min="35"
          max="63"
          step="1"
          overshoot-limit="0"
          orientation="horizontal"
          @input="clampPanelDuringDrag"
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
            <RightPanel v-if="tabs.panelOpen && tabs.activeService" />
          </div>
        </m3e-split-pane>
      </div>
    </div>

    <ServiceModal v-if="serviceModalLoaded" />
    <Snackbar />
  </m3e-theme>
</template>
