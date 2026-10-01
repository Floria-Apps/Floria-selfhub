<script setup lang="ts">
import { computed, ref } from 'vue'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { tintOn } from '../lib/status'
import { isTauri } from '../lib/http'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()
const ui = useUi()

const btn =
  'material-symbols-rounded grid size-10 place-items-center rounded-full text-[22px] text-on-surface-variant transition hover:bg-surface-high active:scale-90 disabled:pointer-events-none disabled:opacity-35'

const query = ref('')
const focused = ref(false)
const input = ref<HTMLInputElement>()

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return services.list.filter((s) => `${s.name} ${s.baseUrl} ${META[s.type].label}`.toLowerCase().includes(q))
})

const display = computed(() => (focused.value ? query.value : (tabs.activeService?.baseUrl ?? '')))

const refreshing = computed(() =>
  tabs.activeService
    ? !!snaps.stateOf(tabs.activeService.id)?.loading
    : services.list.some((s) => snaps.stateOf(s.id)?.loading),
)

function onFocus(e: FocusEvent) {
  focused.value = true
  query.value = ''
  ;(e.target as HTMLInputElement).select()
}
function pick(id: string) {
  tabs.openService(id)
  input.value?.blur()
}
function onEnter() {
  if (matches.value[0]) pick(matches.value[0].id)
}
function addService() {
  input.value?.blur()
  ui.openModal(null)
}
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
    class="relative z-20 flex h-14 shrink-0 items-center gap-1 rounded-[28px] bg-surface px-3 transition-colors duration-500"
  >
    <button :class="btn" :disabled="!tabs.canBack" aria-label="Voltar" @click="tabs.back()">arrow_back</button>
    <button :class="btn" :disabled="!tabs.canForward" aria-label="Avançar" @click="tabs.forward()">arrow_forward</button>
    <button :class="[btn, refreshing && 'spin']" aria-label="Atualizar" @click="refresh()">refresh</button>

    <div class="relative mx-2 flex-1">
      <div class="flex h-10 items-center gap-2 rounded-full bg-surface-high px-4 text-sm focus-within:ring-2 focus-within:ring-primary">
        <span
          class="material-symbols-rounded text-[18px]"
          :style="tabs.activeService ? { color: tintOn(META[tabs.activeService.type].color, 80, 'var(--md-on-surface)') } : undefined"
        >{{ tabs.activeService ? META[tabs.activeService.type].icon : 'search' }}</span>
        <input
          ref="input"
          :value="display"
          class="min-w-0 flex-1 bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant"
          placeholder="Buscar serviço"
          aria-label="Buscar ou abrir serviço"
          spellcheck="false"
          @focus="onFocus"
          @blur="focused = false"
          @input="query = ($event.target as HTMLInputElement).value"
          @keydown.enter="onEnter"
          @keydown.esc="input?.blur()"
        />
      </div>

      <div
        v-if="focused"
        class="absolute top-12 right-0 left-0 overflow-hidden rounded-3xl bg-surface-highest p-2 shadow-lg"
        role="listbox"
      >
        <button
          v-for="s in matches"
          :key="s.id"
          role="option"
          class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-surface-high"
          @mousedown.prevent="pick(s.id)"
        >
          <span
            class="material-symbols-rounded grid size-8 place-items-center rounded-full text-[18px]"
            :style="{ background: tintOn(META[s.type].color, 38, 'var(--md-surface)'), color: tintOn(META[s.type].color, 70, 'var(--md-on-surface)') }"
          >{{ META[s.type].icon }}</span>
          <span class="flex-1 truncate font-medium">{{ s.name }}</span>
          <span class="truncate text-xs text-on-surface-variant">{{ s.baseUrl }}</span>
        </button>
        <p v-if="!matches.length" class="px-3 py-2 text-sm text-on-surface-variant">Nenhum serviço encontrado.</p>
        <button
          class="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium text-primary hover:bg-surface-high"
          @mousedown.prevent="addService"
        >
          <span class="material-symbols-rounded grid size-8 place-items-center text-[20px]">add</span>
          Adicionar serviço
        </button>
      </div>
    </div>

    <button :class="btn" :disabled="!tabs.activeService" aria-label="Abrir no navegador" @click="openExternal()">open_in_new</button>
    <button
      :class="[btn, tabs.panelOpen && tabs.activeService && 'bg-tertiary-container! text-on-tertiary-container!']"
      :disabled="!tabs.activeService"
      :aria-pressed="tabs.panelOpen"
      aria-label="Painel de detalhes"
      @click="tabs.togglePanel()"
    >right_panel_open</button>
  </header>
</template>
