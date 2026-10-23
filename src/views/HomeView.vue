<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { stateLabel, tintOn, visualState } from '../lib/status'
import StatusDot from '../components/ui/StatusDot.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppIconButton from '../components/ui/AppIconButton.vue'

const { t } = useI18n()
const services = useServices()
const snaps = useSnapshots()
const tabs = useTabs()
const ui = useUi()
let suppressCardClick = false

const tiles = computed(() =>
  services.list.map((s) => ({
    service: s,
    meta: META[s.type],
    state: visualState(snaps.stateOf(s.id)),
  })),
)

const sections = computed(() => {
  const favorites = tiles.value.filter(({ service }) => service.favorite)
  const groups = new Map<string, typeof tiles.value>()

  for (const tile of tiles.value) {
    if (tile.service.favorite) continue
    const group = tile.service.group?.trim() ?? ''
    const groupTiles = groups.get(group) ?? []
    groupTiles.push(tile)
    groups.set(group, groupTiles)
  }

  return [
    ...(favorites.length
      ? [{ id: 'favorites', label: t('home.favorites'), group: '', favorite: true, tiles: favorites }]
      : []),
    ...[...groups].map(([group, groupTiles]) => ({
      id: `group:${group}`,
      label: group || t('home.group.other'),
      group,
      favorite: false,
      tiles: groupTiles,
    })),
  ]
})

const summary = computed(() => {
  const total = tiles.value.length
  if (!total) return ''
  const ok = tiles.value.filter((x) => x.state === 'ok').length
  return t('home.summary', { total, ok, count: total })
})

function moveService(id: string, offset: -1 | 1) {
  services.move(id, offset)
}

function startDragging(id: string, event: DragEvent) {
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function openService(id: string) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }

  tabs.openService(id)
}

function dropIntoSection(
  targetId: string | null,
  group: string,
  favorite: boolean,
  event: DragEvent,
) {
  const id = event.dataTransfer?.getData('text/plain')
  if (!id) return

  suppressCardClick = true
  const sourceGroup = favorite && !group ? services.get(id)?.group ?? '' : group
  services.organize(id, targetId, { group: sourceGroup, favorite })
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Sem serviços -->
    <div v-if="services.ready && !tiles.length" class="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span aria-hidden="true" class="material-symbols-rounded grid size-24 place-items-center rounded-full bg-primary-container text-[48px] text-on-primary-container">dns</span>
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('home.emptyTitle') }}</h1>
        <p class="mt-2 text-on-surface-variant">{{ t('home.emptyText') }}</p>
      </div>
      <AppButton
        variant="filled"
        size="medium"
        icon="add"
        @click="ui.openModal(null)"
      >
        {{ t('service.add') }}
      </AppButton>
    </div>

    <!-- Com serviços -->
    <template v-else-if="tiles.length">
      <h1 class="text-4xl font-semibold tracking-tight">{{ t('home.title') }}</h1>
      <p class="mt-1 text-on-surface-variant">{{ summary }}</p>

      <section
        v-for="section in sections"
        :key="section.id"
        class="mt-8"
        @dragover.prevent
        @drop="dropIntoSection(null, section.group, section.favorite, $event)"
      >
        <h2 class="mb-3 text-xl font-semibold tracking-tight">
          {{ section.label }}
        </h2>

        <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4">
          <div
            v-for="tile in section.tiles"
            :key="tile.service.id"
            class="min-w-0"
            @dragover.prevent
            @drop.stop="dropIntoSection(tile.service.id, section.group, section.favorite, $event)"
          >
            <m3e-card
              variant="filled"
              actionable
              class="block min-h-56 cursor-pointer transition hover:-translate-y-0.5"
              :style="{
                '--m3e-filled-card-container-color': tintOn(tile.meta.color, 20, 'var(--md-surface-container)'),
                '--m3e-card-shape': '1.75rem',
                '--m3e-card-padding': '1.25rem',
              }"
              @pointerdown="suppressCardClick = false"
              @click="openService(tile.service.id)"
            >
              <div slot="content" class="flex min-h-48 flex-col justify-between gap-5 text-left">
                <span aria-hidden="true"
                  class="material-symbols-rounded grid size-14 place-items-center rounded-2xl text-[28px]"
                  :style="{ background: tintOn(tile.meta.color, 40, 'var(--md-surface)'), color: tintOn(tile.meta.color, 75, 'var(--md-on-surface)') }"
                >{{ tile.meta.icon }}</span>
                <span class="min-w-0">
                  <span class="block truncate text-xl font-semibold">{{ tile.service.name }}</span>
                  <span v-if="!ui.hideAddresses" class="mt-0.5 block truncate text-sm text-on-surface-variant">{{ tile.service.baseUrl }}</span>
                  <span v-else class="mt-0.5 flex items-center gap-1.5 truncate text-sm text-on-surface-variant">
                    <span aria-hidden="true" class="material-symbols-rounded text-[16px]">visibility_off</span>
                    {{ t('privacy.hidden') }}
                  </span>
                </span>
                <span class="flex items-center gap-2 text-sm font-medium">
                  <StatusDot :state="tile.state" />
                  {{ stateLabel(tile.state) }}
                </span>
              </div>
            </m3e-card>

            <div class="mt-1 flex justify-end gap-1">
              <AppButton
                :variant="tile.service.favorite ? 'tonal' : 'text'"
                size="extra-small"
                :icon="tile.service.favorite ? 'star' : 'star_outline'"
                @click="services.updateOrganization(tile.service.id, {
                  favorite: !tile.service.favorite,
                  group: tile.service.group,
                })"
              >
                {{ tile.service.favorite ? t('home.unfavorite') : t('home.favorite') }}
              </AppButton>
              <AppIconButton
                size="extra-small"
                icon="drag_indicator"
                :label="t('home.drag')"
                :draggable="true"
                @dragstart="startDragging(tile.service.id, $event)"
              />
              <AppIconButton
                size="extra-small"
                icon="keyboard_arrow_up"
                :label="t('home.moveUp')"
                :disabled="services.list.findIndex((service) => service.id === tile.service.id) === 0"
                @click="moveService(tile.service.id, -1)"
              />
              <AppIconButton
                size="extra-small"
                icon="keyboard_arrow_down"
                :label="t('home.moveDown')"
                :disabled="services.list.findIndex((service) => service.id === tile.service.id) === services.list.length - 1"
                @click="moveService(tile.service.id, 1)"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4">
        <m3e-card
          variant="outlined"
          actionable
          class="grid min-h-56 cursor-pointer place-items-center text-on-surface-variant transition hover:-translate-y-0.5"
          style="--m3e-card-shape: 1.75rem"
          @click="ui.openModal(null)"
        >
          <div slot="content" class="flex min-h-48 flex-col items-center justify-center gap-3">
            <span aria-hidden="true" class="material-symbols-rounded grid size-12 place-items-center rounded-full bg-primary-container text-[26px] text-on-primary-container">add</span>
            <span class="font-medium">{{ t('service.add') }}</span>
          </div>
        </m3e-card>
      </div>
    </template>
  </div>
</template>
