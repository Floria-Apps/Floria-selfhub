
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

const closedLabel = computed(() => {
  if (current.value) {
    return ui.hideAddresses
      ? current.value.name
      : `${current.value.name} · ${hostOf(current.value.baseUrl)}`
  }

  return tabs.isSettings ? t('settings.title') : ''
})

// Com endereços ocultos, a pesquisa não permite descobrir URLs.
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()

  return services.list.filter((s) => {
    const text = ui.hideAddresses
      ? `${s.name} ${META[s.type].label}`
      : `${s.name} ${s.baseUrl} ${META[s.type].label}`

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
    {
      id: 'add',
      icon: 'add',
      label: t('service.add'),
      run: () => ui.openModal(null),
    },
    {
      id: 'tab',
      icon: 'tab',
      label: t('tab.new'),
      run: () => tabs.openNewTab(),
    },
    {
      id: 'settings',
      icon: 'settings',
      label: t('settings.title'),
      run: () => tabs.openSettings(),
    },
  ]

  const q = query.value.trim().toLowerCase()
  return q ? all.filter((action) => action.label.toLowerCase().includes(q)) : all
})

const total = computed(() => matches.value.length + actions.value.length)

async function open() {
  focused.value = true
  query.value = ''
  activeIndex.value = 0

  await nextTick()
  input.value?.focus()
}

function handleFocus() {
  focused.value = true
}

function close() {
  focused.value = false
  query.value = ''
  activeIndex.value = 0
  input.value?.blur()
}

function handleBlur() {
  if (!focused.value) return

  focused.value = false
  query.value = ''
  activeIndex.value = 0
}

function clearQuery() {
  query.value = ''
  activeIndex.value = 0
}

function handleInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
}

function run(index: number) {
  const serviceCount = matches.value.length

  if (index < serviceCount) {
    const service = matches.value[index]
    if (service) tabs.openService(service.id)
  } else {
    actions.value[index - serviceCount]?.run()
  }

  close()
}

function move(delta: number) {
  if (!total.value) return

  activeIndex.value =
    (activeIndex.value + delta + total.value) % total.value
}

watch(query, () => {
  activeIndex.value = 0
})

watch(() => ui.omniboxTick, () => {
  void open()
})

watch(activeIndex, async () => {
  await nextTick()

  list.value
    ?.querySelector('[aria-selected="true"]')
    ?.scrollIntoView({ block: 'nearest' })
})

const bubble = (color: string) => ({
  background: tintOn(color, 38, 'var(--md-surface)'),
  color: tintOn(color, 70, 'var(--md-on-surface)'),
})

const rowBase =
  'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors'

const sectionTitle =
  'px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase'
</script>

<template>
  <m3e-search-view
    class="block w-full"
    mode="docked"
    contained
    hide-search-icon
    style="
      --m3e-search-view-contained-docked-bar-shape: 999px;
      --m3e-search-view-docked-container-max-height: min(28rem, calc(100vh - 7rem));
      --m3e-search-view-docked-container-shape: 1.75rem;
      --m3e-search-view-contained-docked-bar-results-gap: 0.5rem;
    "
    @clear="clearQuery"
  >
    <!-- Ícone da barra fechada -->
    <span
      slot="closed-leading"
      aria-hidden="true"
      class="material-symbols-rounded grid size-7 shrink-0 place-items-center rounded-full"
      :class="
        current
          ? 'text-[16px]'
          : 'text-[20px] text-on-surface-variant'
      "
      :style="current ? bubble(META[current.type].color) : undefined"
    >
      {{
        current
          ? META[current.type].icon
          : tabs.isSettings
            ? 'settings'
            : 'search'
      }}
    </span>

    <!-- Ícone da barra aberta -->
    <span
      slot="open-leading"
      aria-hidden="true"
      class="material-symbols-rounded grid size-7 shrink-0 place-items-center text-[20px] text-on-surface-variant"
    >
      search
    </span>

    <!-- Campo gerenciado pelo m3e -->
    <input
      slot="input"
      ref="input"
      :value="focused ? query : closedLabel"
      :readonly="!focused"
      role="combobox"
      :aria-expanded="focused"
      aria-controls="omni-list"
      aria-autocomplete="list"
      :aria-activedescendant="
        focused && total ? `omni-opt-${activeIndex}` : undefined
      "
      :aria-label="t('omni.aria')"
      :placeholder="
        focused || (!current && !tabs.isSettings)
          ? t('omni.placeholder')
          : ''
      "
      class="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
      spellcheck="false"
      autocomplete="off"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="total > 0 && run(activeIndex)"
      @keydown.esc.prevent="close"
    />

    <!-- Atalho quando fechada -->
    <kbd
      slot="closed-trailing"
      class="shrink-0 rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant"
    >
      {{ shortcut }}
    </kbd>

    <!-- Atalho quando aberta -->
    <kbd
      slot="open-trailing"
      class="shrink-0 rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant"
    >
      Esc
    </kbd>

    <!-- Resultados de serviços -->
    <div
      v-if="matches.length"
      class="p-2"
    >
      <p :class="sectionTitle">
        {{ t('omni.services') }}
      </p>

      <button
        v-for="(s, i) in matches"
        :id="`omni-opt-${i}`"
        :key="s.id"
        type="button"
        role="option"
        :aria-selected="i === activeIndex"
        :class="[
          rowBase,
          i === activeIndex
            ? 'bg-secondary-container text-on-secondary-container'
            : 'hover:bg-surface-high',
        ]"
        @mouseenter="activeIndex = i"
        @mousedown.prevent="run(i)"
      >
        <span
          aria-hidden="true"
          class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
          :style="bubble(META[s.type].color)"
        >
          {{ META[s.type].icon }}
        </span>

        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">
            {{ s.name }}
          </span>
          <span class="block truncate text-xs opacity-70">
            {{ META[s.type].label }}
          </span>
        </span>

        <span
          v-if="!ui.hideAddresses"
          class="max-w-[40%] shrink-0 truncate text-xs opacity-70"
        >
          {{ hostOf(s.baseUrl) }}
        </span>

        <StatusDot :state="visualState(snaps.stateOf(s.id))" />
      </button>
    </div>

    <p
      v-else-if="query.trim()"
      class="px-4 py-3 text-sm text-on-surface-variant"
    >
      {{ t('omni.none') }}
    </p>

    <p
      v-else-if="!services.list.length"
      class="px-4 py-3 text-sm text-on-surface-variant"
    >
      {{ t('settings.servicesEmpty') }}
    </p>

    <!-- Ações rápidas -->
    <div
      v-if="actions.length"
      class="p-2"
    >
      <div
        v-if="matches.length || query.trim() === ''"
        class="mx-2 my-1 h-px bg-outline-variant/60"
      />

      <p :class="sectionTitle">
        {{ t('omni.actions') }}
      </p>

      <button
        v-for="(action, j) in actions"
        :id="`omni-opt-${matches.length + j}`"
        :key="action.id"
        type="button"
        role="option"
        :aria-selected="matches.length + j === activeIndex"
        :class="[
          rowBase,
          matches.length + j === activeIndex
            ? 'bg-secondary-container text-on-secondary-container'
            : 'hover:bg-surface-high',
        ]"
        @mouseenter="activeIndex = matches.length + j"
        @mousedown.prevent="run(matches.length + j)"
      >
        <span
          aria-hidden="true"
          class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full bg-surface-container text-[20px] text-primary"
        >
          {{ action.icon }}
        </span>

        <span class="flex-1 font-medium">
          {{ action.label }}
        </span>
      </button>
    </div>
  </m3e-search-view>
</template>
