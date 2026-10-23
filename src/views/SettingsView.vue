
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import pkg from '../../package.json'
import { buildConfig, copyText, parseConfig, serviceKey } from '../lib/config'
import { isDesktop, LOCALES, locale, localeName, type Locale } from '../lib/i18n'
import { tintOn } from '../lib/status'
import { META } from '../services/registry'
import type { ServiceConfig } from '../services/types'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { REFRESH_OPTIONS, THEME_MODES, useUi, type ThemeMode } from '../stores/ui'
import AppButton from '../components/ui/AppButton.vue'
import AppIconButton from '../components/ui/AppIconButton.vue'
import Segmented from '../components/ui/Segmented.vue'
import SettingRow from '../components/ui/SettingRow.vue'
import Switch from '../components/ui/Switch.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'

const { t } = useI18n()
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

const localeOptions = LOCALES.map((l) => ({
  value: l,
  label: localeName(l),
}))

const refreshOptions = computed(() =>
  REFRESH_OPTIONS.map((s) => ({
    value: s,
    label: s === 0 ? t('opt.off') : s < 60 ? `${s} s` : `${s / 60} min`,
  })),
)

const setLocale = (l: Locale) => (locale.value = l)

const serviceColorOptions = Object.values(META)

const pendingRemoval = ref<{
  type: 'service' | 'all'
  service?: ServiceConfig
} | null>(null)

const confirmingRemoval = computed(
  () => pendingRemoval.value !== null,
)

function removeService(service: ServiceConfig) {
  pendingRemoval.value = {
    type: 'service',
    service,
  }
}

function removeAll() {
  pendingRemoval.value = { type: 'all' }
}

function cancelRemoval() {
  pendingRemoval.value = null
}

function confirmRemoval() {
  const pending = pendingRemoval.value
  if (!pending) return

  if (pending.type === 'service' && pending.service) {
    const service = pending.service

    tabs.closeForService(service.id)
    services.remove(service.id)
    ui.showToast(t('panel.removed', { name: service.name }))
  } else if (pending.type === 'all') {
    for (const service of [...services.list]) {
      tabs.closeForService(service.id)
      services.remove(service.id)
    }

    ui.showToast(t('settings.resetDone'))
  }

  pendingRemoval.value = null
}

function updateGroup(service: ServiceConfig, event: Event) {
  const input = event.target as HTMLInputElement

  services.updateOrganization(service.id, {
    favorite: service.favorite ?? false,
    group: input.value,
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
              v-for="service in serviceColorOptions"
              :key="service.type"
              type="button"
              class="size-8 rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              :class="ui.seedColor === service.color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''"
              :style="{ backgroundColor: service.color }"
              :aria-label="t('settings.serviceColor', { name: service.label })"
              :aria-pressed="ui.seedColor === service.color"
              :title="service.label"
              @click="ui.seedColor = service.color"
            />

            <label
              class="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-black/10 text-white transition-transform hover:scale-110 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary"
              :class="!serviceColorOptions.some((service) => service.color === ui.seedColor) ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''"
              :style="{ backgroundColor: ui.seedColor }"
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

    <!-- Sistema -->
    <section
      v-if="isDesktop"
      :class="card"
      aria-labelledby="s-system"
    >
      <h2 id="s-system" class="text-lg font-semibold">
        {{ t('settings.system') }}
      </h2>

      <div class="divide-y divide-outline-variant/60">
        <SettingRow
          :title="t('settings.notifications')"
          :description="t('settings.notificationsDesc')"
        >
          <Switch
            :model-value="ui.notificationsEnabled"
            :label="t('settings.notifications')"
            @update:model-value="ui.setNotificationsEnabled"
          />
        </SettingRow>

        <SettingRow
          :title="t('settings.startOnLogin')"
          :description="t('settings.startOnLoginDesc')"
        >
          <Switch
            :model-value="ui.startOnLogin"
            :label="t('settings.startOnLogin')"
            @update:model-value="ui.setStartOnLogin"
          />
        </SettingRow>

        <SettingRow
          :title="t('settings.tray')"
          :description="t('settings.trayDesc')"
        />
      </div>
    </section>

    <!-- Serviços -->
    <section :class="card" aria-labelledby="s-services">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">
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
          class="flex flex-col gap-3 rounded-2xl bg-surface-high p-3"
        >
          <div class="flex min-w-0 items-center gap-3">
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

            <m3e-button
              type="button"
              variant="text"
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
            </m3e-button>

            <AppIconButton
              :icon="s.favorite ? 'star' : 'star_outline'"
              :label="s.favorite ? t('settings.unfavorite') : t('settings.favorite')"
              :variant="s.favorite ? 'tonal' : 'standard'"
              :pressed="s.favorite"
              @click="services.updateOrganization(s.id, {
                favorite: !s.favorite,
                group: s.group,
              })"
            />

            <AppIconButton
              icon="edit"
              :label="t('service.edit')"
              @click="ui.openModal(s.id)"
            />

            <AppIconButton
              icon="delete"
              :label="t('common.remove')"
              @click="removeService(s)"
            />
          </div>

          <m3e-form-field variant="outlined" class="w-full sm:w-64">
            <label slot="label" :for="`service-group-${s.id}`">
              {{ t('settings.group') }}
            </label>

            <input
              :id="`service-group-${s.id}`"
              :value="s.group ?? ''"
              :placeholder="t('settings.groupPlaceholder')"
              class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
              @change="updateGroup(s, $event)"
            />
          </m3e-form-field>
        </li>
      </ul>
    </section>

    <!-- Dados -->
    <section :class="card" aria-labelledby="s-data">
      <h2 class="text-lg font-semibold">
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
          <p class="font-medium">
            {{ t('settings.import') }}
          </p>

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
            variant="tonal"
            :danger="true"
            icon="delete_forever"
            :disabled="!services.list.length"
            @click="removeAll"
          >
            {{ t('common.remove') }}
          </AppButton>
        </SettingRow>
      </div>
    </section>

    <!-- Sobre -->
    <section :class="card" aria-labelledby="s-about">
      <h2 class="text-lg font-semibold">
        {{ t('settings.about') }}
      </h2>

      <p class="mt-2 text-sm text-on-surface-variant">
        {{ t('settings.aboutText', { version: pkg.version }) }}
      </p>
    </section>

    <!-- Confirmação de exclusão -->
    <ConfirmDialog
      :open="confirmingRemoval"
      :title="
        pendingRemoval?.type === 'all'
          ? t('settings.removeAll')
          : t('common.remove')
      "
      :message="
        pendingRemoval?.type === 'all'
          ? t('settings.removeAllDesc')
          : pendingRemoval?.service?.name ?? ''
      "
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      @confirm="confirmRemoval"
      @cancel="cancelRemoval"
      @update:open="(open) => !open && cancelRemoval()"
    />
  </div>
</template>
