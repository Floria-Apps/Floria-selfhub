<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { hostOf } from '../lib/address'
import { tintOn, visualState } from '../lib/status'
import StatusDot from './ui/StatusDot.vue'

const { t } = useI18n()
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

const rowStyle = (active: boolean) => ({
  '--m3e-list-item-container-color': active
    ? 'var(--md-secondary-container)'
    : 'transparent',
  '--m3e-list-item-label-text-color': active
    ? 'var(--md-on-secondary-container)'
    : 'var(--md-on-surface)',
})

const sectionTitle =
  'px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-on-surface-variant uppercase'
</script>

<template>
  <m3e-search-view
    class="omnibox-search block w-full min-w-0"
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
      id="omni-list"
      ref="list"
      role="listbox"
      :aria-label="t('omni.aria')"
    >
      <div
        v-if="matches.length"
        role="group"
        aria-labelledby="omni-services-label"
        class="p-2"
      >
        <p id="omni-services-label" :class="sectionTitle">
          {{ t('omni.services') }}
        </p>

        <m3e-list-item
          v-for="(s, i) in matches"
          :id="`omni-opt-${i}`"
          :key="s.id"
          tabindex="-1"
          role="option"
          :aria-selected="i === activeIndex"
          :style="rowStyle(i === activeIndex)"
          @mouseenter="activeIndex = i"
          @mousedown.prevent
          @click="run(i)"
        >
          <span
            slot="leading"
            aria-hidden="true"
            class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
            :style="bubble(META[s.type].color)"
          >
            {{ META[s.type].icon }}
          </span>

          {{ s.name }}

          <span slot="supporting-text">
            {{ META[s.type].label }}
          </span>

          <span slot="trailing" class="flex shrink-0 items-center gap-2">
            <span
              v-if="!ui.hideAddresses"
              class="max-w-48 truncate text-xs opacity-70"
            >
              {{ hostOf(s.baseUrl) }}
            </span>
            <StatusDot :state="visualState(snaps.stateOf(s.id))" />
          </span>
        </m3e-list-item>
      </div>

      <div
        v-if="actions.length"
        role="group"
        aria-labelledby="omni-actions-label"
        class="p-2"
      >
        <div
          v-if="matches.length"
          class="mx-2 my-1 h-px bg-outline-variant/60"
        />

        <p id="omni-actions-label" :class="sectionTitle">
          {{ t('omni.actions') }}
        </p>

        <m3e-list-item
          v-for="(action, j) in actions"
          :id="`omni-opt-${matches.length + j}`"
          :key="action.id"
          tabindex="-1"
          role="option"
          :aria-selected="matches.length + j === activeIndex"
          :style="rowStyle(matches.length + j === activeIndex)"
          @mouseenter="activeIndex = matches.length + j"
          @mousedown.prevent
          @click="run(matches.length + j)"
        >
          <span
            slot="leading"
            aria-hidden="true"
            class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full bg-surface-container text-[20px] text-primary"
          >
            {{ action.icon }}
          </span>

          {{ action.label }}
        </m3e-list-item>
      </div>
    </div>

    <p
      v-if="!matches.length && query.trim()"
      role="status"
      class="px-4 py-3 text-sm text-on-surface-variant"
    >
      {{ t('omni.none') }}
    </p>

    <p
      v-else-if="!services.list.length"
      role="status"
      class="px-4 py-3 text-sm text-on-surface-variant"
    >
      {{ t('settings.servicesEmpty') }}
    </p>
  </m3e-search-view>
</template>
