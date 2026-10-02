<script setup lang="ts">
import { computed } from 'vue'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { isTauri } from '../lib/http'
import { t } from '../lib/i18n'
import Omnibox from './Omnibox.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()

const btn =
  'material-symbols-rounded grid size-10 shrink-0 place-items-center rounded-full text-[22px] text-on-surface-variant transition hover:bg-surface-high active:scale-90 disabled:pointer-events-none disabled:opacity-35'

const refreshing = computed(() =>
  tabs.activeService
    ? !!snaps.stateOf(tabs.activeService.id)?.loading
    : services.list.some((s) => snaps.stateOf(s.id)?.loading),
)

function refresh() {
  if (tabs.activeService) snaps.refresh(tabs.activeService.id)
  else snaps.refreshAll()
}

async function openExternal() {
  const url = tabs.activeService?.baseUrl
  if (!url) return
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else window.open(url, '_blank')
}
</script>

<template>
  <header
    data-tauri-drag-region
    class="relative z-20 flex h-16 shrink-0 items-center gap-1 rounded-[28px] bg-surface px-3 transition-colors duration-500"
  >
    <button :class="btn" :disabled="!tabs.canBack" :aria-label="t('nav.back')" @click="tabs.back()">arrow_back</button>
    <button :class="btn" :disabled="!tabs.canForward" :aria-label="t('nav.forward')" @click="tabs.forward()">arrow_forward</button>
    <button :class="[btn, refreshing && 'spin']" :aria-label="t('nav.refresh')" @click="refresh()">refresh</button>

    <div class="mx-2 flex min-w-0 flex-1 justify-center">
      <Omnibox class="w-full max-w-2xl" />
    </div>

    <button :class="btn" :disabled="!tabs.activeService" :aria-label="t('nav.external')" @click="openExternal()">open_in_new</button>
    <button
      :class="[btn, tabs.panelOpen && tabs.activeService && 'bg-tertiary-container! text-on-tertiary-container!']"
      :disabled="!tabs.activeService"
      :aria-pressed="tabs.panelOpen"
      :aria-label="t('nav.panel')"
      @click="tabs.togglePanel()"
    >right_panel_open</button>
  </header>
</template>
