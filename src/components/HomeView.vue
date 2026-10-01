<script setup lang="ts">
import { computed } from 'vue'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { STATE_LABEL, tintOn, visualState } from '../lib/status'
import StatusDot from './StatusDot.vue'

const services = useServices()
const snaps = useSnapshots()
const tabs = useTabs()
const ui = useUi()

const tiles = computed(() =>
  services.list.map((s) => ({
    service: s,
    meta: META[s.type],
    state: visualState(snaps.stateOf(s.id)),
  })),
)

const summary = computed(() => {
  const total = tiles.value.length
  if (!total) return ''
  const ok = tiles.value.filter((t) => t.state === 'ok').length
  return `${total} ${total === 1 ? 'serviço' : 'serviços'}, ${ok} ${ok === 1 ? 'no ar' : 'no ar'}`
})
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Sem serviços -->
    <div v-if="services.ready && !tiles.length" class="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span class="material-symbols-rounded grid size-24 place-items-center rounded-full bg-primary-container text-[48px] text-on-primary-container">dns</span>
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Adicione seu primeiro serviço</h1>
        <p class="mt-2 text-on-surface-variant">
          Conecte Jellyfin, Navidrome, Uptime Kuma, Gatus ou Speedtest Tracker e veja tudo em um só lugar.
        </p>
      </div>
      <button
        class="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-sm transition hover:shadow-md active:scale-95"
        @click="ui.openModal(null)"
      >
        <span class="material-symbols-rounded">add</span>
        Adicionar serviço
      </button>
    </div>

    <!-- Com serviços -->
    <template v-else-if="tiles.length">
      <h1 class="text-4xl font-semibold tracking-tight">Seus serviços</h1>
      <p class="mt-1 text-on-surface-variant">{{ summary }}</p>

      <div class="mt-8 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <button
          v-for="t in tiles"
          :key="t.service.id"
          class="flex flex-col gap-5 rounded-[28px] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          :style="{ background: tintOn(t.meta.color, 20, 'var(--md-surface-container)') }"
          @click="tabs.openService(t.service.id)"
        >
          <span
            class="material-symbols-rounded grid size-14 place-items-center rounded-2xl text-[28px]"
            :style="{ background: tintOn(t.meta.color, 40, 'var(--md-surface)'), color: tintOn(t.meta.color, 75, 'var(--md-on-surface)') }"
          >{{ t.meta.icon }}</span>
          <span class="min-w-0">
            <span class="block truncate text-xl font-semibold">{{ t.service.name }}</span>
            <span class="mt-0.5 block truncate text-sm text-on-surface-variant">{{ t.service.baseUrl }}</span>
          </span>
          <span class="flex items-center gap-2 text-sm font-medium">
            <StatusDot :state="t.state" />
            {{ STATE_LABEL[t.state] }}
          </span>
        </button>

        <button
          class="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-outline-variant text-on-surface-variant transition hover:bg-surface-container active:scale-[0.98]"
          @click="ui.openModal(null)"
        >
          <span class="material-symbols-rounded grid size-12 place-items-center rounded-full bg-primary-container text-[26px] text-on-primary-container">add</span>
          <span class="font-medium">Adicionar serviço</span>
        </button>
      </div>
    </template>
  </div>
</template>
