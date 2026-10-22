
<script setup lang="ts">
import { computed } from 'vue'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { isTauri } from '../lib/http'
import { t } from '../lib/i18n'
import Omnibox from './Omnibox.vue'
import AppIconButton from './AppIconButton.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()

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
    data-tauri-drag-region
    class="relative z-20 flex h-16 shrink-0 items-center gap-1 rounded-[28px] bg-surface px-3 transition-colors duration-500"
  >
    <AppIconButton
      size="medium"
      icon="arrow_back"
      :label="t('nav.back')"
      :disabled="!tabs.canBack"
      @click="tabs.back()"
    />

    <AppIconButton
      size="medium"
      icon="arrow_forward"
      :label="t('nav.forward')"
      :disabled="!tabs.canForward"
      @click="tabs.forward()"
    />

    <AppIconButton
      size="medium"
      icon="refresh"
      :label="t('nav.refresh')"
      :loading="refreshing"
      @click="refresh"
    />

    <div class="mx-2 flex min-w-0 flex-1 justify-center">
      <Omnibox class="w-full max-w-2xl" />
    </div>

    <AppIconButton
      size="medium"
      icon="open_in_new"
      :label="t('nav.external')"
      :disabled="!tabs.activeService"
      @click="openExternal"
    />

    <AppIconButton
      size="medium"
      icon="right_panel_open"
      :label="t('nav.panel')"
      :variant="tabs.panelOpen && tabs.activeService ? 'tonal' : 'standard'"
      :pressed="!!tabs.activeService && tabs.panelOpen"
      :disabled="!tabs.activeService"
      @click="tabs.togglePanel()"
    />
  </header>
</template>
