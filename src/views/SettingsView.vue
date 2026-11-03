
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import pkg from '../../package.json'
import { buildConfig, copyText, parseConfig, serviceKey } from '../lib/config'
import { serviceDisplayName } from '../lib/service'
import { isDesktop, LOCALES, localeName } from '../lib/i18n'
import { tintOn } from '../lib/status'
import { fetchLatestReleaseVersion, isNewerVersion } from '../lib/updates'
import { META } from '../services/registry'
import type { ServiceConfig } from '../services/types'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { REFRESH_OPTIONS, THEME_CONTRASTS, THEME_SEEDS, THEME_VARIANTS, useUi, type LocalePreference } from '../stores/ui'
import AppButton from '../components/ui/AppButton.vue'
import AppIconButton from '../components/ui/AppIconButton.vue'
import Segmented from '../components/ui/Segmented.vue'
import SettingRow from '../components/ui/SettingRow.vue'
import Switch from '../components/ui/Switch.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import SettingsSection from '../components/ui/SettingsSection.vue'

const { t } = useI18n()
const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

const updateCheck = ref<'idle' | 'checking' | 'up-to-date' | 'outdated' | 'error'>('idle')
const latestVersion = ref('')

async function openExternal(url: string) {
  try {
    if (isDesktop) {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch {
    ui.showToast(t('settings.aboutLinkError'), 'error')
  }
}

async function checkForUpdates() {
  if (updateCheck.value === 'checking') return
  updateCheck.value = 'checking'

  try {
    latestVersion.value = await fetchLatestReleaseVersion()
    updateCheck.value = isNewerVersion(latestVersion.value, pkg.version) ? 'outdated' : 'up-to-date'
  } catch {
    updateCheck.value = 'error'
  }
}

onMounted(() => {
  void checkForUpdates()
})

const contrastOptions = computed(() =>
  THEME_CONTRASTS.map((level) => ({
    value: level,
    label: t(`opt.${level}`),
  })),
)

const themeVariantOptions = computed(() =>
  THEME_VARIANTS.map((variant) => ({
    value: variant,
    label: t(`settings.variant.${variant}`),
  })),
)

const localeOptions = computed(() => [
  { value: 'auto' as const, label: t('opt.auto'), icon: 'language' },
  ...LOCALES.map((language) => ({
    value: language,
    label: localeName(language),
  })),
])

const refreshOptions = computed(() =>
  REFRESH_OPTIONS.map((s) => ({
    value: s,
    label: s === 0 ? t('opt.off') : s < 60 ? `${s} s` : `${s / 60} min`,
  })),
)

const setLocale = (language: LocalePreference) => ui.setLanguagePreference(language)

const settingsNavItems = computed(() => {
  const sections = [
    { id: 'settings-appearance', key: 'settings.appearance' },
    { id: 'settings-language', key: 'settings.language' },
    { id: 'settings-privacy', key: 'privacy.title' },
    { id: 'settings-behavior', key: 'settings.behavior' },
    ...(isDesktop ? [{ id: 'settings-system', key: 'settings.system' }] : []),
    { id: 'settings-groups', key: 'settings.groups' },
    { id: 'settings-services', key: 'settings.services' },
    { id: 'settings-data', key: 'settings.data' },
    { id: 'settings-about', key: 'settings.about' },
  ]

  return sections.map(({ id, key }) => ({ id, label: t(key) }))
})

const isCustomSeed = computed(
  () => !THEME_SEEDS.some((seed) => seed.color === ui.seedColor),
)
const newGroupName = ref('')
const serviceSections = computed(() => {
  const sections: {
    id: string
    label: string
    services: ServiceConfig[]
  }[] = []
  const favorites = services.list.filter((service) => service.favorite)

  if (favorites.length) {
    sections.push({
      id: 'favorites',
      label: t('home.favorites'),
      services: favorites,
    })
  }

  for (const group of services.groups) {
    const groupedServices = services.list.filter((service) =>
      !service.favorite
      && service.group?.trim().toLowerCase() === group.toLowerCase(),
    )
    if (groupedServices.length) {
      sections.push({ id: `group:${group}`, label: group, services: groupedServices })
    }
  }

  const ungrouped = services.list.filter(
    (service) => !service.favorite && !service.group?.trim(),
  )
  if (ungrouped.length) {
    sections.push({
      id: 'group:',
      label: t('home.group.other'),
      services: ungrouped,
    })
  }

  return sections
})

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
    ui.showToast(t('panel.removed', { name: serviceDisplayName(service) }))
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
  const input = event.currentTarget as HTMLElement & { value: string }

  services.updateOrganization(service.id, {
    favorite: service.favorite ?? false,
    group: input.value || undefined,
  })
}

function updateAlias(service: ServiceConfig, event: Event) {
  const input = event.currentTarget as HTMLInputElement
  services.updateAlias(service.id, input.value)
}

function toggleMonitoring(service: ServiceConfig) {
  const resume = service.monitoringPaused === true
  services.setMonitoringPaused(service.id, !resume)
  if (resume) void snaps.refresh(service.id)
}

function createGroup() {
  if (!services.createGroup(newGroupName.value)) {
    ui.showToast(t('settings.groupExists'), 'error')
    return
  }

  newGroupName.value = ''
  ui.showToast(t('settings.groupCreated'))
}

function removeGroup(group: string) {
  if (services.removeGroup(group)) ui.showToast(t('settings.groupRemoved'))
}

function resetPrefs() {
  ui.resetPrefs()
  ui.showToast(t('settings.prefsDone'))
}

async function exportConfig() {
  const ok = await copyText(buildConfig(services.list, ui.prefs(), services.groups))

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
    let addedGroups = 0

    for (const group of parsed.groups) {
      if (services.createGroup(group)) addedGroups++
    }

    for (const draft of parsed.services) {
      if (known.has(serviceKey(draft))) continue

      services.add(draft)
      known.add(serviceKey(draft))
      added++
    }

    ui.applyPrefs(parsed.prefs)
    importText.value = ''
    snaps.refreshAll()

    if (added && addedGroups) {
      ui.showToast(t('settings.importedWithGroups', { services: added, groups: addedGroups }))
    } else if (added) {
      ui.showToast(t('settings.imported', { n: added, count: added }))
    } else if (addedGroups) {
      ui.showToast(t('settings.importedGroups', { count: addedGroups }))
    } else {
      ui.showToast(t('settings.importNone'))
    }
  } catch {
    ui.showToast(t('settings.importInvalid'), 'error')
  }
}

</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-4">
    <header class="mb-1">
      <h1 class="text-4xl font-semibold tracking-tight">
        {{ t('settings.title') }}
      </h1>
    </header>

    <div class="sticky -top-8 z-10 -mx-8 bg-surface px-8 py-2">
      <nav
        :aria-label="t('settings.quickNav')"
        class="flex gap-2 overflow-x-auto rounded-2xl bg-surface-container p-2"
      >
        <a
          v-for="item in settingsNavItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="shrink-0 rounded-full px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {{ item.label }}
        </a>
      </nav>
    </div>

    <!-- Aparência -->
    <SettingsSection id="settings-appearance" :title="t('settings.appearance')" icon="palette">
      <div>
        <SettingRow
          :title="t('settings.accent')"
          :description="t('settings.accentDesc')"
          divider
        >
          <div class="flex max-w-full flex-wrap items-center justify-end gap-3">
            <AppButton
              :variant="ui.dynamicColor ? 'tonal' : 'outlined'"
              :icon="ui.dynamicColor ? 'check' : 'palette'"
              :aria-pressed="ui.dynamicColor"
              @click="ui.dynamicColor = !ui.dynamicColor"
            >
              {{ t('settings.dynamic') }}
            </AppButton>

            <div v-if="!ui.dynamicColor" class="flex flex-wrap items-center justify-end gap-3">
              <button
                v-for="seed in THEME_SEEDS"
                :key="seed.name"
                type="button"
                class="grid size-12 place-items-center rounded-full border-2 border-surface transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                :class="ui.seedColor === seed.color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''"
                :style="{ backgroundColor: seed.color }"
                :aria-label="t('settings.seedColor', { color: t(`settings.seed.${seed.name}`) })"
                :aria-pressed="ui.seedColor === seed.color"
                :title="t(`settings.seed.${seed.name}`)"
                @click="ui.seedColor = seed.color"
              >
                <span
                  v-if="ui.seedColor === seed.color"
                  class="grid size-7 place-items-center rounded-full bg-surface text-on-surface shadow-sm"
                  aria-hidden="true"
                >
                  <m3e-icon name="check" variant="rounded" />
                </span>
              </button>

              <label
                class="relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-surface transition-transform hover:scale-105 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary"
                :class="isCustomSeed ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''"
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
                  class="pointer-events-none grid size-7 place-items-center rounded-full bg-surface text-on-surface shadow-sm"
                >
                  <m3e-icon :name="isCustomSeed ? 'check' : 'palette'" variant="rounded" />
                </span>
              </label>
            </div>
          </div>
        </SettingRow>

        <SettingRow
          :title="t('settings.colorStyle')"
          :description="t('settings.colorStyleDesc')"
          divider
        >
          <div class="flex max-w-full flex-wrap justify-end gap-2">
            <AppButton
              v-for="option in themeVariantOptions"
              :key="option.value"
              size="small"
              :variant="ui.themeVariant === option.value ? 'tonal' : 'outlined'"
              :icon="ui.themeVariant === option.value ? 'check' : undefined"
              :aria-pressed="ui.themeVariant === option.value"
              @click="ui.themeVariant = option.value"
            >
              {{ option.label }}
            </AppButton>
          </div>
        </SettingRow>

        <SettingRow
          :title="t('settings.contrast')"
          :description="t('settings.contrastDesc')"
        >
          <Segmented
            :options="contrastOptions"
            :model-value="ui.contrast"
            :label="t('settings.contrast')"
            @update:model-value="ui.contrast = $event"
          />
        </SettingRow>

      </div>
    </SettingsSection>

    <SettingsSection id="settings-language" :title="t('settings.language')" icon="language">
      <SettingRow
        :title="t('settings.language')"
        :description="t('settings.languageDesc')"
      >
        <Segmented
          :options="localeOptions"
          :model-value="ui.languagePreference"
          :label="t('settings.language')"
          @update:model-value="setLocale"
        />
      </SettingRow>
    </SettingsSection>

    <!-- Privacidade -->
    <SettingsSection id="settings-privacy" :title="t('privacy.title')" icon="lock">
      <div>
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
    </SettingsSection>

    <!-- Comportamento -->
    <SettingsSection id="settings-behavior" :title="t('settings.behavior')" icon="tune">
      <div>
        <SettingRow
          :title="t('settings.refresh')"
          :description="t('settings.refreshDesc')"
          divider
        >
          <Segmented
            :options="refreshOptions"
            :model-value="ui.refreshSeconds"
            :label="t('settings.refresh')"
            @update:model-value="ui.refreshSeconds = $event"
          />
        </SettingRow>

        <SettingRow
          :title="t('settings.showTips')"
          :description="t('settings.showTipsDesc')"
        >
          <Switch
            v-model="ui.showTips"
            :label="t('settings.showTips')"
          />
        </SettingRow>
      </div>
    </SettingsSection>

    <!-- Sistema -->
    <SettingsSection
      v-if="isDesktop"
      id="settings-system"
      :title="t('settings.system')"
      icon="computer"
    >
      <div>
        <SettingRow
          :title="t('settings.notifications')"
          :description="t('settings.notificationsDesc')"
          divider
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
          divider
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
        >
          <Switch
            v-model="ui.closeToTray"
            :label="t('settings.tray')"
          />
        </SettingRow>
      </div>
    </SettingsSection>

    <!-- Serviços -->
    <SettingsSection id="settings-groups" :title="t('settings.groups')" icon="folder">
      <p class="mt-1 text-sm text-on-surface-variant">
        {{ t('settings.groupsDesc') }}
      </p>

      <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="createGroup">
        <m3e-form-field variant="outlined" class="min-w-48 flex-1">
          <label slot="label" for="new-service-group">
            {{ t('settings.newGroup') }}
          </label>
          <input
            id="new-service-group"
            v-model="newGroupName"
            maxlength="40"
            class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
            :placeholder="t('settings.groupPlaceholder')"
          />
        </m3e-form-field>
        <AppButton
          type="submit"
          icon="create_new_folder"
          :disabled="!newGroupName.trim()"
        >
          {{ t('settings.createGroup') }}
        </AppButton>
      </form>

      <ul v-if="services.groups.length" class="mt-4 flex flex-col gap-2">
        <li
          v-for="(group, index) in services.groups"
          :key="group"
          class="flex min-w-0 items-center gap-2 rounded-xl bg-surface-high px-3 py-2"
        >
          <span class="material-symbols-rounded text-on-surface-variant" aria-hidden="true">
            folder
          </span>
          <span class="min-w-0 flex-1 truncate font-medium">{{ group }}</span>
          <AppIconButton
            size="small"
            icon="keyboard_arrow_up"
            :label="t('settings.moveGroupUp', { name: group })"
            :disabled="index === 0"
            @click="services.moveGroup(group, -1)"
          />
          <AppIconButton
            size="small"
            icon="keyboard_arrow_down"
            :label="t('settings.moveGroupDown', { name: group })"
            :disabled="index === services.groups.length - 1"
            @click="services.moveGroup(group, 1)"
          />
          <AppIconButton
            size="small"
            icon="delete"
            :label="t('settings.removeGroup', { name: group })"
            :disabled="services.list.some((service) => service.group?.trim().toLowerCase() === group.toLowerCase())"
            @click="removeGroup(group)"
          />
        </li>
      </ul>
    </SettingsSection>

    <SettingsSection id="settings-services" :title="t('settings.services')" icon="dns">
      <div class="flex items-center justify-between gap-3">
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

      <ul v-else class="mt-3 flex flex-col gap-4">
        <li v-for="section in serviceSections" :key="section.id">
          <m3e-expansion-panel
            open
            class="block"
            style="
              --m3e-expansion-panel-container-color: var(--md-surface-high);
              --m3e-expansion-panel-shape: 1.25rem;
              --m3e-expansion-panel-content-padding: 0 0.75rem 0.75rem;
            "
          >
            <m3e-expansion-header slot="header">
              <span class="flex min-w-0 flex-1 items-center gap-2">
                <span class="truncate text-sm font-semibold">
                  {{ section.label }}
                </span>
                <span
                  class="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                  aria-hidden="true"
                >
                  {{ section.services.length }}
                </span>
              </span>
            </m3e-expansion-header>
            <ul class="flex flex-col gap-2">
              <li
                v-for="s in section.services"
                :key="s.id"
                class="min-w-0"
              >
                <m3e-card
                  variant="filled"
                  class="block"
                  style="--m3e-filled-card-container-color: var(--md-surface-high); --m3e-card-shape: 1.25rem; --m3e-card-padding: 0.75rem"
                >
                  <div slot="content" class="flex min-w-0 flex-col gap-3">
                    <div class="flex min-w-0 flex-wrap items-center gap-3">
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
                          {{ serviceDisplayName(s) }}
                        </span>

                        <span class="block truncate text-xs text-on-surface-variant">
                          {{ META[s.type].label
                          }}<template v-if="!ui.hideAddresses">
                            , {{ s.baseUrl }}
                          </template>
                        </span>
                      </m3e-button>

                      <div class="ml-auto flex shrink-0 items-center gap-1">
                        <AppIconButton
                          size="small"
                          :icon="s.monitoringPaused ? 'play_circle' : 'pause_circle'"
                          :label="s.monitoringPaused
                            ? t('settings.resumeMonitoring', { name: serviceDisplayName(s) })
                            : t('settings.pauseMonitoring', { name: serviceDisplayName(s) })"
                          :variant="s.monitoringPaused ? 'tonal' : 'standard'"
                          :pressed="s.monitoringPaused"
                          @click="toggleMonitoring(s)"
                        />

                        <AppIconButton
                          size="small"
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
                          size="small"
                          icon="edit"
                          :label="t('service.edit')"
                          @click="ui.openModal(s.id)"
                        />

                        <AppIconButton
                          size="small"
                          icon="keyboard_arrow_up"
                          :label="t('settings.moveServiceUp', { name: serviceDisplayName(s) })"
                          :disabled="section.services[0]?.id === s.id"
                          @click="services.moveWithinGroup(s.id, -1)"
                        />

                        <AppIconButton
                          size="small"
                          icon="keyboard_arrow_down"
                          :label="t('settings.moveServiceDown', { name: serviceDisplayName(s) })"
                          :disabled="section.services[section.services.length - 1]?.id === s.id"
                          @click="services.moveWithinGroup(s.id, 1)"
                        />

                        <AppIconButton
                          size="small"
                          icon="delete"
                          :label="t('common.remove')"
                          @click="removeService(s)"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <m3e-form-field variant="outlined" class="w-full">
                        <label slot="label" :for="`service-alias-${s.id}`">
                          {{ t('settings.alias') }}
                        </label>
                        <input
                          :id="`service-alias-${s.id}`"
                          :value="s.alias ?? ''"
                          class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
                          :placeholder="t('settings.aliasPlaceholder')"
                          autocomplete="off"
                          @change="updateAlias(s, $event)"
                        />
                        <span slot="hint">
                          {{ t('settings.aliasHint') }}
                        </span>
                      </m3e-form-field>

                      <m3e-form-field variant="outlined" class="w-full">
                        <label slot="label" :for="`service-group-${s.id}`">
                          {{ t('settings.group') }}
                        </label>

                        <m3e-select
                          :id="`service-group-${s.id}`"
                          :value="s.group ?? ''"
                          @change="updateGroup(s, $event)"
                        >
                          <m3e-option value="">{{ t('settings.noGroup') }}</m3e-option>
                          <m3e-option
                            v-for="group in services.groups"
                            :key="group"
                            :value="group"
                            :selected="s.group === group"
                          >
                            {{ group }}
                          </m3e-option>
                        </m3e-select>
                      </m3e-form-field>
                    </div>
                  </div>
                </m3e-card>
              </li>
            </ul>
          </m3e-expansion-panel>
        </li>
      </ul>
    </SettingsSection>

    <!-- Dados -->
    <SettingsSection id="settings-data" :title="t('settings.data')" icon="database">
      <div>
        <SettingRow
          :title="t('settings.export')"
          :description="t('settings.exportDesc')"
          divider
        >
          <AppButton
            icon="content_copy"
            :disabled="!services.list.length && !services.groups.length"
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

          <m3e-form-field variant="outlined" class="mt-3 w-full">
            <label slot="label" for="settings-import">
              {{ t('settings.import') }}
            </label>
            <textarea
              id="settings-import"
              v-model="importText"
              rows="4"
              spellcheck="false"
              :placeholder="t('settings.importPlaceholder')"
              class="w-full min-w-0 bg-transparent font-mono text-xs text-on-surface outline-none placeholder:text-on-surface-variant/70 select-text"
            />
            <m3e-textarea-autosize for="settings-import" max-rows="12" />
          </m3e-form-field>

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
        <m3e-divider
          class="block"
          style="--m3e-divider-color: color-mix(in oklab, var(--md-outline-variant) 60%, transparent)"
        />

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
    </SettingsSection>

    <!-- Sobre -->
    <SettingsSection id="settings-about" :title="t('settings.about')" icon="info">
      <div class="mt-2 flex flex-col gap-5">
        <div class="flex items-center gap-4">
          <img
            src="/floria-selfhub.png"
            :alt="t('settings.aboutLogoAlt')"
            class="size-16 shrink-0 rounded-2xl"
          />
          <div class="min-w-0">
            <h3 class="text-lg font-semibold">Floria SelfHub</h3>
            <p class="text-sm text-on-surface-variant">
              {{ t('settings.aboutVersion', { version: pkg.version }) }}
            </p>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{ t('settings.aboutTagline') }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl bg-surface-container p-4" aria-live="polite">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-on-surface-variant">
              <template v-if="updateCheck === 'checking'">{{ t('settings.aboutCheckingUpdates') }}</template>
              <template v-else-if="updateCheck === 'up-to-date'">{{ t('settings.aboutUpToDate', { version: pkg.version }) }}</template>
              <template v-else-if="updateCheck === 'outdated'">{{ t('settings.aboutUpdateAvailable', { version: latestVersion }) }}</template>
              <template v-else-if="updateCheck === 'error'">{{ t('settings.aboutUpdateCheckFailed') }}</template>
              <template v-else>{{ t('settings.aboutUpdateCheckPrompt') }}</template>
            </p>
            <AppButton
              v-if="updateCheck !== 'outdated'"
              variant="outlined"
              :loading="updateCheck === 'checking'"
              @click="checkForUpdates"
            >
              {{ t('settings.aboutCheckUpdates') }}
            </AppButton>
            <AppButton
              v-else
              variant="filled"
              @click="openExternal('https://github.com/Floria-Apps/Floria-selfhub/releases/latest')"
            >
              {{ t('settings.aboutDownloadUpdate') }}
            </AppButton>
          </div>
        </div>

        <p class="text-sm text-on-surface-variant">
          {{ t('settings.aboutPrivacy') }}
        </p>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="group flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:border-primary hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="openExternal('https://github.com/Floria-Apps/Floria-selfhub')"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-on-surface">{{ t('settings.aboutSource') }}</span>
              <span class="mt-0.5 block text-xs text-on-surface-variant">{{ t('settings.aboutSourceDesc') }}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 4h6v6M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
            </svg>
          </button>

          <button
            type="button"
            class="group flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:border-bad hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="openExternal('https://github.com/Floria-Apps/Floria-selfhub/issues/new/choose')"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-error-container text-on-error-container">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 8v5m0 3h.01" /><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-on-surface">{{ t('settings.aboutReportIssue') }}</span>
              <span class="mt-0.5 block text-xs text-on-surface-variant">{{ t('settings.aboutReportIssueDesc') }}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 4h6v6M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
            </svg>
          </button>

          <button
            type="button"
            class="group flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:border-secondary hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="openExternal('https://github.com/Floria-Apps/Floria-selfhub/blob/main/LICENSE.md')"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h5M9 13h6M9 17h6" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-on-surface">{{ t('settings.aboutLicense') }}</span>
              <span class="mt-0.5 block text-xs text-on-surface-variant">{{ t('settings.aboutLicenseDesc') }}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 4h6v6M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
            </svg>
          </button>

          <button
            type="button"
            class="group flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-3 text-left transition-colors hover:border-tertiary hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="openExternal('https://github.com/Floria-Apps/Floria-selfhub/releases')"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v9M8 5.3l8 4.5" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-on-surface">{{ t('settings.aboutReleases') }}</span>
              <span class="mt-0.5 block text-xs text-on-surface-variant">{{ t('settings.aboutReleasesDesc') }}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 4h6v6M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
            </svg>
          </button>
        </div>
      </div>
    </SettingsSection>

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
