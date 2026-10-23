<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { isTauri } from '../lib/http'
import Omnibox from './Omnibox.vue'
import AppIconButton from './ui/AppIconButton.vue'

const tabs = useTabs()
const { t } = useI18n()
const services = useServices()
const snaps = useSnapshots()
const toolbar = ref<HTMLElement>()
const compact = ref(false)
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  const element = toolbar.value
  if (!element) return

  resizeObserver = new ResizeObserver(([entry]) => {
    compact.value = entry.contentRect.width < 720
  })

  resizeObserver.observe(element)
})

onUnmounted(() => resizeObserver?.disconnect())

const refreshing = computed(() =>
  tabs.activeService
    ? !!snaps.stateOf(tabs.activeService.id)?.loading
    : services.list.some((s) => snaps.stateOf(s.id)?.loading),
)

function refresh() {
  if (tabs.activeService) {
    snaps.refresh(tabs.activeService.id)
  } else {
    snaps.refreshAll()
  }
}

async function openExternal() {
  const url = tabs.activeService?.baseUrl
  if (!url) return

  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank')
  }
}
</script>


<template>
  <header
    ref="toolbar"
    data-tauri-drag-region
    class="app-toolbar relative z-20 flex h-16 shrink-0 items-center gap-1 rounded-[28px] bg-surface px-3 transition-colors duration-500"
    :class="{ 'is-compact': compact }"
  >
    <AppIconButton
      :size="compact ? 'small' : 'medium'"
      shape="rounded"
      width="default"
      icon="arrow_back"
      :label="t('nav.back')"
      :disabled="!tabs.canBack"
      @click="tabs.back()"
    />

    <AppIconButton
      :size="compact ? 'small' : 'medium'"
      shape="rounded"
      width="default"
      icon="arrow_forward"
      :label="t('nav.forward')"
      :disabled="!tabs.canForward"
      @click="tabs.forward()"
    />

    <AppIconButton
      :size="compact ? 'small' : 'medium'"
      shape="rounded"
      width="default"
      icon="refresh"
      :label="t('nav.refresh')"
      :loading="refreshing"
      @click="refresh"
    />

    <div class="toolbar-omnibox mx-1 flex min-w-0 flex-1 justify-center">
      <Omnibox class="w-full min-w-0 max-w-none" />
    </div>

    <AppIconButton
      :size="compact ? 'small' : 'medium'"
      shape="rounded"
      width="default"
      icon="open_in_new"
      :label="t('nav.external')"
      :disabled="!tabs.activeService"
      @click="openExternal"
    />

    <AppIconButton
      :size="compact ? 'small' : 'medium'"
      shape="rounded"
      width="default"
      icon="right_panel_open"
      :label="t('nav.panel')"
      :variant="tabs.panelOpen && tabs.activeService ? 'tonal' : 'standard'"
      :pressed="!!tabs.activeService && tabs.panelOpen"
      :disabled="!tabs.activeService"
      @click="tabs.togglePanel()"
    />
  </header>
</template>
