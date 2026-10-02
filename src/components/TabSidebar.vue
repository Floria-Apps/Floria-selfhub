<script setup lang="ts">
import { computed } from 'vue'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { SETTINGS_ID, useTabs } from '../stores/tabs'
import { tintOn, visualState } from '../lib/status'
import { t } from '../lib/i18n'
import StatusDot from './StatusDot.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()

const rows = computed(() =>
  tabs.tabs.map((tab) => {
    const s = services.get(tab.serviceId)
    return s
      ? {
          id: tab.id,
          name: s.name,
          icon: META[s.type].icon,
          color: META[s.type].color as string | null,
          state: visualState(snaps.stateOf(s.id)),
        }
      : tab.serviceId === SETTINGS_ID
        ? { id: tab.id, name: t('settings.title'), icon: 'settings', color: null, state: null }
        : { id: tab.id, name: t('tab.new'), icon: 'grid_view', color: null, state: null }
  }),
)

</script>

<template>
  <aside
    class="flex w-64 shrink-0 flex-col gap-1 rounded-[28px] bg-surface p-3 transition-colors duration-500"
    :aria-label="t('tab.list')"
  >
    <div data-tauri-drag-region class="flex items-center gap-3 px-2 pt-2 pb-3">
      <span aria-hidden="true" class="material-symbols-rounded grid size-10 place-items-center rounded-2xl bg-primary text-[22px] text-on-primary">hub</span>
      <span class="text-lg font-semibold tracking-tight">SelfHub</span>
    </div>

    <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" role="tablist" aria-orientation="vertical">
      <div
        v-for="row in rows"
        :key="row.id"
        class="group relative flex items-center rounded-full transition-colors"
        :class="row.id === tabs.activeId ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-high'"
      >
        <button
          role="tab"
          :aria-selected="row.id === tabs.activeId"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-full py-2 pr-10 pl-2 text-left text-sm font-medium"
          @click="tabs.activate(row.id)"
        >
          <span aria-hidden="true"
            class="material-symbols-rounded relative grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
            :style="row.color
              ? { background: tintOn(row.color, 38, 'var(--md-surface)'), color: tintOn(row.color, 70, 'var(--md-on-surface)') }
              : { background: 'var(--md-surface-high)' }"
          >
            {{ row.icon }}
            <StatusDot v-if="row.state" :state="row.state" class="absolute -right-0.5 -bottom-0.5 ring-2 ring-surface" />
          </span>
          <span class="truncate">{{ row.name }}</span>
        </button>

        <button
          class="material-symbols-rounded absolute right-2 grid size-7 place-items-center rounded-full text-[18px] opacity-0 transition hover:bg-surface-highest focus-visible:opacity-100 group-hover:opacity-100"
          :aria-label="t('tab.close', { name: row.name })"
          @click="tabs.close(row.id)"
        >close</button>
      </div>
    </nav>

    <button
      class="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-primary-container px-4 py-3.5 text-sm font-semibold text-on-primary-container shadow-sm transition hover:shadow-md active:scale-95"
      @click="tabs.openNewTab()"
    >
      <span aria-hidden="true" class="material-symbols-rounded">add</span>
      {{ t('tab.new') }}
    </button>

    <button
      class="mt-1 flex items-center gap-3 rounded-full px-3 py-2 text-sm transition"
      :class="tabs.isSettings ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-high'"
      @click="tabs.openSettings()"
    >
      <span aria-hidden="true" class="material-symbols-rounded text-[20px]">settings</span>
      {{ t('settings.title') }}
    </button>
  </aside>
</template>
