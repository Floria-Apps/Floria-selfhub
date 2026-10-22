
<script setup lang="ts">
import { computed, ref } from 'vue'
import pkg from '../../package.json'
import { buildConfig, copyText, parseConfig, serviceKey } from '../lib/config'
import { LOCALES, locale, t, type Locale } from '../lib/i18n'
import { tintOn } from '../lib/status'
import { META } from '../services/registry'
import type { ServiceConfig } from '../services/types'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { REFRESH_OPTIONS, THEME_MODES, useUi, type ThemeMode } from '../stores/ui'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'
import Segmented from './Segmented.vue'
import SettingRow from './SettingRow.vue'
import Switch from './Switch.vue'

const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

const THEME_ICONS: Record<ThemeMode, string> = {
  auto: 'brightness_auto',
  light: 'light_mode',
  dark: 'dark_mode',
}

const themeOptions = computed(() =>
  THEME_MODES.map((m) => ({
    value: m,
    label: t(`opt.${m}`),
    icon: THEME_ICONS[m],
  })),
)

const NATIVE_NAMES: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português',
}

const localeOptions = LOCALES.map((l) => ({
  value: l,
  label: NATIVE_NAMES[l],
}))

const refreshOptions = computed(() =>
  REFRESH_OPTIONS.map((s) => ({
    value: s,
    label: s === 0 ? t('opt.off') : s < 60 ? `${s} s` : `${s / 60} min`,
  })),
)

const setLocale = (l: Locale) => (locale.value = l)

const SWATCHES = [
  '#6750a4',
  '#a95fe0',
  '#2f80ff',
  '#00acc1',
  '#3ecf8e',
  '#ffb300',
  '#ff8a3d',
  '#ff5c8a',
]

// Confirmação em dois cliques para ações destrutivas.
const confirming = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function confirmOnce(key: string, action: () => void) {
  if (confirming.value === key) {
    confirming.value = null
    action()
    return
  }

  confirming.value = key
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => {
    confirming.value = null
  }, 4000)
}

function removeService(s: ServiceConfig) {
  confirmOnce(`svc:${s.id}`, () => {
    tabs.closeForService(s.id)
    services.remove(s.id)
    ui.showToast(t('panel.removed', { name: s.name }))
  })
}

function removeAll() {
  confirmOnce('all', () => {
    for (const s of [...services.list]) {
      tabs.closeForService(s.id)
      services.remove(s.id)
    }

    ui.showToast(t('settings.resetDone'))
  })
}

function resetPrefs() {
  ui.resetPrefs()
  ui.showToast(t('settings.prefsDone'))
}

async function exportConfig() {
  const ok = await copyText(buildConfig(services.list, ui.prefs()))

  ui.showToast(
    ok ? t('settings.copied') : t('settings.copyFail'),
    ok ? 'ok' : 'error',
  )
}

const importText = ref('')

function importConfig() {
  try {
    const parsed = parseConfig(importText.value)
    const known = new Set(services.list.map(serviceKey))
    let added = 0

    for (const draft of parsed.services) {
      if (known.has(serviceKey(draft))) continue

      services.add(draft)
      known.add(serviceKey(draft))
      added++
    }

    ui.applyPrefs(parsed.prefs)
    importText.value = ''
    snaps.refreshAll()

    ui.showToast(
      added
        ? t('settings.imported', { n: added, count: added })
        : t('settings.importNone'),
    )
  } catch {
    ui.showToast(t('settings.importInvalid'), 'error')
  }
}

const card =
  'rounded-[28px] bg-surface-container p-6 transition-colors duration-500'
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-4">
    <h1 class="mb-2 text-4xl font-semibold tracking-tight">
      {{ t('settings.title') }}
    </h1>

    <!-- Aparência -->
    <section :class="card" aria-labelledby="s-appearance">
      <h2 id="s-appearance" class="text-lg font-semibold">
        {{ t('settings.appearance') }}
      </h2>

      <div class="divide-y divide-outline-variant/60">
        <SettingRow
          :title="t('settings.theme')"
          :description="t('settings.themeDesc')"
        >
          <Segmented
            :options="themeOptions"
            :model-value="ui.mode"
            :label="t('settings.theme')"
            @update:model-value="ui.mode = $event"
          />
        </SettingRow>

        <SettingRow
          :title="t('settings.language')"
          :description="t('settings.languageDesc')"
        >
          <Segmented
            :options="localeOptions"
            :model-value="locale"
            :label="t('settings.language')"
            @update:model-value="setLocale"
          />
        </SettingRow>

        <SettingRow
          :title="t('settings.dynamic')"
          :description="t('settings.dynamicDesc')"
        >
          <Switch
            v-model="ui.dynamicColor"
            :label="t('settings.dynamic')"
          />
        </SettingRow>

        <SettingRow
          v-if="!ui.dynamicColor"
          :title="t('settings.accent')"
          :description="t('settings.accentDesc')"
        >
          <div class="flex flex-wrap items-center justify-end gap-2">
            <button
              v-for="c in SWATCHES"
              :key="c"
              type="button"
              :aria-label="c"
              :aria-pressed="ui.seedColor === c"
              class="size-8 rounded-full ring-offset-2 ring-offset-surface-container transition active:scale-90"
              :class="ui.seedColor === c ? 'ring-2 ring-on-surface' : ''"
              :style="{ background: c }"
              @click="ui.seedColor = c"
            />

            <label
              class="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full ring-2 ring-outline-variant"
              :title="t('settings.customColor')"
            >
              <input
                type="color"
                class="absolute -inset-2 size-12 cursor-pointer opacity-0"
                :value="ui.seedColor"
                :aria-label="t('settings.customColor')"
                @input="ui.seedColor = ($event.target as HTMLInputElement).value"
              />

              <span
                aria-hidden="true"
                class="material-symbols-rounded pointer-events-none text-[18px]"
              >
                palette
              </span>
            </label>
          </div>
        </SettingRow>
      </div>
    </section>

    <!-- Privacidade -->
    <section :class="card" aria-labelledby="s-privacy">
      <h2 id="s-privacy" class="text-lg font-semibold">
        {{ t('privacy.title') }}
      </h2>

      <div class="divide-y divide-outline-variant/60">
        <SettingRow
          :title="t('privacy.hide')"
          :description="t('privacy.hideDesc')"
        >
          <Switch
            v-model="ui.hideAddresses"
            :label="t('privacy.hide')"
          />
        </SettingRow>
      </div>
    </section>

    <!-- Comportamento -->
    <section :class="card" aria-labelledby="s-behavior">
      <h2 id="s-behavior" class="text-lg font-semibold">
        {{ t('settings.behavior') }}
      </h2>

      <div class="divide-y divide-outline-variant/60">
        <SettingRow
          :title="t('settings.refresh')"
          :description="t('settings.refreshDesc')"
        >
          <Segmented
            :options="refreshOptions"
            :model-value="ui.refreshSeconds"
            :label="t('settings.refresh')"
            @update:model-value="ui.refreshSeconds = $event"
          />
        </SettingRow>
      </div>
    </section>

    <!-- Serviços -->
    <section :class="card" aria-labelledby="s-services">
      <div class="flex items-center justify-between gap-3">
        <h2 id="s-services" class="text-lg font-semibold">
          {{ t('settings.services') }}
        </h2>

        <AppButton
          icon="add"
          @click="ui.openModal(null)"
        >
          {{ t('service.add') }}
        </AppButton>
      </div>

      <p
        v-if="!services.list.length"
        class="mt-4 text-sm text-on-surface-variant"
      >
        {{ t('settings.servicesEmpty') }}
      </p>

      <ul v-else class="mt-3 flex flex-col gap-2">
        <li
          v-for="s in services.list"
          :key="s.id"
          class="flex items-center gap-3 rounded-2xl bg-surface-high p-3"
        >
          <span
            aria-hidden="true"
            class="material-symbols-rounded grid size-10 shrink-0 place-items-center rounded-full text-[22px]"
            :style="{
              background: tintOn(META[s.type].color, 38, 'var(--md-surface)'),
              color: tintOn(META[s.type].color, 70, 'var(--md-on-surface)'),
            }"
          >
            {{ META[s.type].icon }}
          </span>

          <button
            type="button"
            class="min-w-0 flex-1 rounded-lg text-left"
            @click="tabs.openService(s.id)"
          >
            <span class="block truncate font-medium">
              {{ s.name }}
            </span>

            <span class="block truncate text-xs text-on-surface-variant">
              {{ META[s.type].label
              }}<template v-if="!ui.hideAddresses">
                , {{ s.baseUrl }}
              </template>
            </span>
          </button>

          <AppIconButton
            icon="edit"
            :label="t('service.edit')"
            @click="ui.openModal(s.id)"
          />

          <template v-if="confirming === `svc:${s.id}`">
            <AppButton
              variant="filled"
              :danger="true"
              icon="delete"
              @click="removeService(s)"
            >
              {{ t('common.confirm') }}
            </AppButton>
          </template>

          <template v-else>
            <AppIconButton
              icon="delete"
              :label="t('common.remove')"
              @click="removeService(s)"
            />
          </template>
        </li>
      </ul>
    </section>

    <!-- Dados -->
    <section :class="card" aria-labelledby="s-data">
      <h2 id="s-data" class="text-lg font-semibold">
        {{ t('settings.data') }}
      </h2>

      <div class="divide-y divide-outline-variant/60">
        <SettingRow
          :title="t('settings.export')"
          :description="t('settings.exportDesc')"
        >
          <AppButton
            icon="content_copy"
            :disabled="!services.list.length"
            @click="exportConfig"
          >
            {{ t('settings.exportBtn') }}
          </AppButton>
        </SettingRow>

        <div class="py-4">
          <p class="font-medium">{{ t('settings.import') }}</p>

          <p class="mt-0.5 text-sm text-on-surface-variant">
            {{ t('settings.importDesc') }}
          </p>

          <textarea
            v-model="importText"
            rows="4"
            spellcheck="false"
            :placeholder="t('settings.importPlaceholder')"
            :aria-label="t('settings.import')"
            class="mt-3 w-full resize-y rounded-2xl bg-surface-highest px-4 py-3 font-mono text-xs text-on-surface outline-none placeholder:text-on-surface-variant/70 select-text focus:ring-2 focus:ring-primary"
          />

          <div class="mt-2 flex justify-end">
            <AppButton
              icon="upload"
              :disabled="!importText.trim()"
              @click="importConfig"
            >
              {{ t('settings.importBtn') }}
            </AppButton>
          </div>
        </div>

        <SettingRow
          :title="t('settings.resetPrefs')"
          :description="t('settings.resetPrefsDesc')"
        >
          <AppButton
            icon="restart_alt"
            @click="resetPrefs"
          >
            {{ t('settings.resetPrefsBtn') }}
          </AppButton>
        </SettingRow>

        <SettingRow
          :title="t('settings.removeAll')"
          :description="t('settings.removeAllDesc')"
        >
          <AppButton
            :variant="confirming === 'all' ? 'filled' : 'tonal'"
            :danger="true"
            icon="delete_forever"
            :disabled="!services.list.length"
            @click="removeAll"
          >
            {{
              confirming === 'all'
                ? t('common.confirm')
                : t('common.remove')
            }}
          </AppButton>
        </SettingRow>
      </div>
    </section>

    <!-- Sobre -->
    <section :class="card" aria-labelledby="s-about">
      <h2 id="s-about" class="text-lg font-semibold">
        {{ t('settings.about') }}
      </h2>

      <p class="mt-2 text-sm text-on-surface-variant">
        {{ t('settings.aboutText', { version: pkg.version }) }}
      </p>
    </section>
  </div>
</template>
