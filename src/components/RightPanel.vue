<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { t } from '../lib/i18n'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()
const ui = useUi()

const service = computed(() => tabs.activeService)
const state = computed(() => snaps.stateOf(service.value?.id))
const data = computed(() => state.value?.data)
const confirming = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

watch(() => service.value?.id, () => (confirming.value = false))

function remove() {
  const s = service.value
  if (!s) return
  if (!confirming.value) {
    confirming.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => (confirming.value = false), 4000)
    return
  }
  tabs.closeForService(s.id)
  services.remove(s.id)
  ui.showToast(t('panel.removed', { name: s.name }))
  confirming.value = false
}

const dot = (status?: string) =>
  ({ up: 'bg-ok', down: 'bg-bad', warn: 'bg-warn', idle: 'bg-on-surface-variant/50' })[status ?? 'idle']
</script>

<template>
  <Transition name="panel">
    <aside v-if="tabs.panelOpen && service" class="w-80 shrink-0" :aria-label="t('panel.aria')">
      <div class="flex h-full w-80 flex-col gap-4 rounded-[28px] bg-tertiary-container p-5 text-on-tertiary-container transition-colors duration-500">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-semibold">{{ data?.itemsTitle ?? t('panel.title') }}</h2>
            <p class="truncate text-sm opacity-75">{{ service.name }}</p>
          </div>
          <button
            class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px] transition hover:bg-black/10 active:scale-90"
            :aria-label="t('panel.close')"
            @click="tabs.togglePanel()"
          >close</button>
        </div>

        <div class="-mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2">
          <template v-if="data">
            <p v-if="!data.items.length" class="rounded-2xl bg-surface/60 p-4 text-sm">{{ data.emptyText }}</p>
            <div v-for="item in data.items" :key="item.id" class="rounded-2xl bg-surface/70 p-3 text-on-surface">
              <div class="flex items-start gap-2">
                <span class="mt-1.5 size-2.5 shrink-0 rounded-full" :class="dot(item.status)" />
                <p class="min-w-0 flex-1 text-sm leading-snug font-medium break-words">{{ item.title }}</p>
                <span v-if="item.trailing" class="shrink-0 text-xs text-on-surface-variant tabular-nums">{{ item.trailing }}</span>
              </div>
              <p v-if="item.subtitle" class="mt-0.5 pl-[18px] text-xs break-words text-on-surface-variant">{{ item.subtitle }}</p>
              <div v-if="item.progress != null" class="mt-2 ml-[18px] h-1.5 overflow-hidden rounded-full bg-on-surface/10">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.min(100, item.progress * 100)}%` }" />
              </div>
            </div>
          </template>
          <p v-else-if="state?.error" class="rounded-2xl bg-surface/60 p-4 text-sm">
            {{ t('panel.noData') }}
          </p>
          <template v-else>
            <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-surface/50" />
          </template>
        </div>

        <div class="flex gap-2">
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface/70 px-4 py-2.5 text-sm font-medium transition hover:bg-surface active:scale-95"
            @click="ui.openModal(service.id)"
          >
            <span aria-hidden="true" class="material-symbols-rounded text-[18px]">edit</span>
            {{ t('common.edit') }}
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95"
            :class="confirming ? 'bg-bad text-white' : 'bg-surface/70 hover:bg-surface'"
            @click="remove()"
          >
            <span aria-hidden="true" class="material-symbols-rounded text-[18px]">delete</span>
            {{ confirming ? t('common.confirm') : t('common.remove') }}
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
