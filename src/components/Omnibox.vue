<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { hostOf } from '../lib/address'
import { t } from '../lib/i18n'
import { tintOn, visualState } from '../lib/status'
import StatusDot from './StatusDot.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()
const ui = useUi()

const query = ref('')
const focused = ref(false)
const activeIndex = ref(0)
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()

const shortcut = /Mac/i.test(navigator.platform) ? '⌘L' : 'Ctrl+L'
const current = computed(() => tabs.activeService)

// Com os endereços ocultos, a busca também ignora o endereço (senão daria para descobri-lo digitando)
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return services.list.filter((s) => {
    const text = ui.hideAddresses ? `${s.name} ${META[s.type].label}` : `${s.name} ${s.baseUrl} ${META[s.type].label}`
    return text.toLowerCase().includes(q)
  })
})

interface Action {
  id: string
  icon: string
  label: string
  run: () => void
}
const actions = computed<Action[]>(() => {
  const all: Action[] = [
    { id: 'add', icon: 'add', label: t('service.add'), run: () => ui.openModal(null) },
    { id: 'tab', icon: 'tab', label: t('tab.new'), run: () => tabs.openNewTab() },
    { id: 'settings', icon: 'settings', label: t('settings.title'), run: () => tabs.openSettings() },
  ]
  const q = query.value.trim().toLowerCase()
  return q ? all.filter((a) => a.label.toLowerCase().includes(q)) : all
})

const total = computed(() => matches.value.length + actions.value.length)

async function open() {
  focused.value = true
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  input.value?.focus()
}

function close() {
  focused.value = false
}

function run(index: number) {
  const n = matches.value.length
  if (index < n) tabs.openService(matches.value[index].id)
  else actions.value[index - n]?.run()
  close()
}

function move(delta: number) {
  if (!total.value) return
  activeIndex.value = (activeIndex.value + delta + total.value) % total.value
}

watch(query, () => (activeIndex.value = 0))
watch(() => ui.omniboxTick, open)
watch(activeIndex, async () => {
  await nextTick()
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
})

const bubble = (color: string) => ({
  background: tintOn(color, 38, 'var(--md-surface)'),
  color: tintOn(color, 70, 'var(--md-on-surface)'),
})
const rowBase = 'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors'
const sectionTitle = 'px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase'
</script>

<template>
  <div class="relative">
    <!-- Barra -->
    <div
      class="flex h-11 items-center gap-3 rounded-full px-3 text-sm transition-colors"
      :class="focused ? 'bg-surface-highest ring-2 ring-primary' : 'bg-surface-high hover:bg-surface-highest'"
    >
      <span
        v-if="current"
        aria-hidden="true"
        class="material-symbols-rounded grid size-7 shrink-0 place-items-center rounded-full text-[16px]"
        :style="bubble(META[current.type].color)"
      >{{ META[current.type].icon }}</span>
      <span
        v-else
        aria-hidden="true"
        class="material-symbols-rounded grid size-7 shrink-0 place-items-center text-[20px] text-on-surface-variant"
      >{{ tabs.isSettings ? 'settings' : 'search' }}</span>

      <button
        v-if="!focused"
        type="button"
        class="flex min-w-0 flex-1 items-baseline gap-2 text-left"
        :aria-label="t('omni.aria')"
        @click="open"
      >
        <template v-if="current">
          <span class="max-w-[55%] shrink-0 truncate font-medium">{{ current.name }}</span>
          <span v-if="!ui.hideAddresses" class="min-w-0 truncate text-on-surface-variant">{{ hostOf(current.baseUrl) }}</span>
        </template>
        <span v-else-if="tabs.isSettings" class="font-medium">{{ t('settings.title') }}</span>
        <span v-else class="truncate text-on-surface-variant">{{ t('omni.placeholder') }}</span>
      </button>

      <input
        v-else
        ref="input"
        v-model="query"
        role="combobox"
        aria-expanded="true"
        aria-controls="omni-list"
        aria-autocomplete="list"
        :aria-activedescendant="total ? `omni-opt-${activeIndex}` : undefined"
        :aria-label="t('omni.aria')"
        :placeholder="t('omni.placeholder')"
        class="min-w-0 flex-1 bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant"
        spellcheck="false"
        autocomplete="off"
        @blur="close"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="total && run(activeIndex)"
        @keydown.esc.prevent="close"
      />

      <kbd class="shrink-0 rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
        {{ focused ? 'Esc' : shortcut }}
      </kbd>
    </div>

    <!-- Resultados -->
    <div
      v-if="focused"
      id="omni-list"
      ref="list"
      role="listbox"
      :aria-label="t('omni.aria')"
      class="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-30 max-h-[min(28rem,calc(100vh-7rem))] overflow-y-auto rounded-[28px] bg-surface-highest p-2 shadow-xl"
    >
      <template v-if="matches.length">
        <p :class="sectionTitle">{{ t('omni.services') }}</p>
        <button
          v-for="(s, i) in matches"
          :id="`omni-opt-${i}`"
          :key="s.id"
          role="option"
          :aria-selected="i === activeIndex"
          :class="[rowBase, i === activeIndex ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-high']"
          @mouseenter="activeIndex = i"
          @mousedown.prevent="run(i)"
        >
          <span
            aria-hidden="true"
            class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
            :style="bubble(META[s.type].color)"
          >{{ META[s.type].icon }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ s.name }}</span>
            <span class="block truncate text-xs opacity-70">{{ META[s.type].label }}</span>
          </span>
          <span v-if="!ui.hideAddresses" class="max-w-[40%] shrink-0 truncate text-xs opacity-70">{{ hostOf(s.baseUrl) }}</span>
          <StatusDot :state="visualState(snaps.stateOf(s.id))" />
        </button>
      </template>
      <p v-else-if="query.trim()" class="px-4 py-3 text-sm text-on-surface-variant">{{ t('omni.none') }}</p>
      <p v-else-if="!services.list.length" class="px-4 py-3 text-sm text-on-surface-variant">{{ t('settings.servicesEmpty') }}</p>

      <template v-if="actions.length">
        <div v-if="matches.length || query.trim() === ''" class="mx-2 my-1 h-px bg-outline-variant/60" />
        <p :class="sectionTitle">{{ t('omni.actions') }}</p>
        <button
          v-for="(a, j) in actions"
          :id="`omni-opt-${matches.length + j}`"
          :key="a.id"
          role="option"
          :aria-selected="matches.length + j === activeIndex"
          :class="[rowBase, matches.length + j === activeIndex ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-high']"
          @mouseenter="activeIndex = matches.length + j"
          @mousedown.prevent="run(matches.length + j)"
        >
          <span
            aria-hidden="true"
            class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full bg-surface-container text-[20px] text-primary"
          >{{ a.icon }}</span>
          <span class="flex-1 font-medium">{{ a.label }}</span>
        </button>
      </template>
    </div>
  </div>
</template>
