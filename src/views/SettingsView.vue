
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import pkg from '../../package.json'
import { buildConfig, copyText, parseConfig, serviceKey } from '../lib/config'
import { serviceDisplayName } from '../lib/service'
import { isDesktop, LOCALES, localeName } from '../lib/i18n'
import { tintOn } from '../lib/status'
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
        >
          <Segmented
            :options="refreshOptions"
            :model-value="ui.refreshSeconds"
            :label="t('settings.refresh')"
            @update:model-value="ui.refreshSeconds = $event"
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
        />
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
      <p class="mt-2 text-sm text-on-surface-variant">
        {{ t('settings.aboutText', { version: pkg.version }) }}
      </p>
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
