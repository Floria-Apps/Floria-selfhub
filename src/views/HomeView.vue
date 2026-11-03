<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { fmtAgo } from '../lib/format'
import { serviceDisplayName } from '../lib/service'
import { stateLabel, tintOn, visualState } from '../lib/status'
import ServiceStatus from '../components/ui/ServiceStatus.vue'
import ServiceHealthOverview, {
  type ServiceHealthCounts,
  type ServiceHealthFilter,
} from '../components/ui/ServiceHealthOverview.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppIconButton from '../components/ui/AppIconButton.vue'
import AppCallout from '../components/ui/AppCallout.vue'
import AvailabilityChart from '../components/AvailabilityChart.vue'
import { buildAvailabilitySeries } from '../lib/history'

const { t } = useI18n()
const services = useServices()
const snaps = useSnapshots()
const tabs = useTabs()
const ui = useUi()
let suppressCardClick = false
const draggingServiceId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const selectedHealthFilter = ref<ServiceHealthFilter>('all')

const tiles = computed(() =>
  services.list.map((s) => ({
    service: s,
    meta: META[s.type],
    state: visualState(snaps.stateOf(s.id)),
  })),
)

const healthCounts = computed<ServiceHealthCounts>(() => {
  const counts: ServiceHealthCounts = { ok: 0, warn: 0, bad: 0, loading: 0, paused: 0 }
  for (const tile of tiles.value) {
    counts[tile.service.monitoringPaused ? 'paused' : tile.state]++
  }
  return counts
})

const filteredTiles = computed(() => {
  const filter = selectedHealthFilter.value
  if (filter === 'all') return tiles.value
  if (filter === 'paused') return tiles.value.filter(({ service }) => service.monitoringPaused)
  return tiles.value.filter(({ service, state }) => !service.monitoringPaused && state === filter)
})

const activeFilterLabel = computed(() => {
  const filter = selectedHealthFilter.value
  if (filter === 'all') return ''
  return t(filter === 'paused' ? 'settings.monitoringPaused' : `state.${filter}`)
})

const sections = computed(() => {
  const favorites = filteredTiles.value.filter(({ service }) => service.favorite)
  const groups = new Map<string, typeof filteredTiles.value>()

  for (const tile of filteredTiles.value) {
    if (tile.service.favorite) continue
    const groupName = tile.service.group?.trim() ?? ''
    const group = services.groups.find((name) => name.toLowerCase() === groupName.toLowerCase()) ?? groupName
    const groupTiles = groups.get(group) ?? []
    groupTiles.push(tile)
    groups.set(group, groupTiles)
  }

  const orderedGroups = services.groups.flatMap((group) => {
    const groupTiles = groups.get(group) ?? []
    groups.delete(group)
    if (!groupTiles.length && selectedHealthFilter.value !== 'all') return []
    return [{
      id: `group:${group}`,
      label: group,
      group,
      favorite: false,
      tiles: groupTiles,
    }]
  })

  const ungrouped = groups.get('') ?? []
  return [
    ...(favorites.length
      ? [{ id: 'favorites', label: t('home.favorites'), group: '', favorite: true, tiles: favorites }]
      : []),
    ...orderedGroups,
    ...(ungrouped.length
      ? [{ id: 'group:', label: t('home.group.other'), group: '', favorite: false, tiles: ungrouped }]
      : []),
  ]
})


const attention = computed(() =>
  filteredTiles.value
    .filter(({ service, state }) =>
      !service.monitoringPaused && (state === 'bad' || state === 'warn'),
    )
    .sort((a, b) => (a.state === 'bad' ? 0 : 1) - (b.state === 'bad' ? 0 : 1)),
)

const availability = computed(() => {
  return buildAvailabilitySeries(
    services.list,
    (id) => snaps.historyOf(id),
    snaps.now,
  )
})

function moveService(id: string, offset: -1 | 1) {
  services.moveWithinGroup(id, offset)
}

function startDragging(id: string, event: DragEvent) {
  draggingServiceId.value = id
  dropTargetId.value = null
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dragOverTarget(id: string, event: DragEvent) {
  event.preventDefault()
  if (draggingServiceId.value !== id) dropTargetId.value = id
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function finishDragging() {
  draggingServiceId.value = null
  dropTargetId.value = null
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
  finishDragging()
  if (!id || id === targetId) return

  suppressCardClick = true
  const sourceGroup = favorite && !group ? services.get(id)?.group ?? '' : group
  services.organize(id, targetId, { group: sourceGroup, favorite })
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Sem serviços -->
    <div v-if="services.ready && !tiles.length" class="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span aria-hidden="true" class="material-symbols-rounded grid size-24 place-items-center rounded-full bg-surface-high text-[48px] text-on-surface-variant">dns</span>
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('home.emptyTitle') }}</h1>
        <p class="mt-2 text-on-surface-variant">{{ t('home.emptyText') }}</p>
      </div>
      <section v-if="ui.showTips" class="w-full rounded-3xl bg-surface-container p-5 text-left" :aria-label="t('home.onboardingTitle')">
        <h2 class="font-semibold">{{ t('home.onboardingTitle') }}</h2>
        <ol class="mt-3 flex flex-col gap-3 text-sm text-on-surface-variant">
          <li class="flex gap-3"><span class="font-semibold text-primary">1</span><span>{{ t('home.onboardingChoose') }}</span></li>
          <li class="flex gap-3"><span class="font-semibold text-primary">2</span><span>{{ t('home.onboardingCredentials') }}</span></li>
          <li class="flex gap-3"><span class="font-semibold text-primary">3</span><span>{{ t('home.onboardingTest') }}</span></li>
        </ol>
      </section>
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
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-4xl font-semibold tracking-tight">{{ t('home.title') }}</h1>
        <AppButton
          variant="filled"
          icon="add"
          @click="ui.openModal(null)"
        >
          {{ t('service.add') }}
        </AppButton>
      </header>
      <ServiceHealthOverview
        class="mt-4"
        :counts="healthCounts"
        :selected="selectedHealthFilter"
        @select="selectedHealthFilter = $event"
      />
      <div
        v-if="selectedHealthFilter !== 'all'"
        class="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"
        aria-live="polite"
      >
        <span>{{ t('home.activeFilter', { status: activeFilterLabel }) }}</span>
        <button
          type="button"
          class="font-medium text-primary underline-offset-2 hover:underline"
          @click="selectedHealthFilter = 'all'"
        >
          {{ t('home.clearFilter') }}
        </button>
      </div>

      <AppCallout
        v-if="ui.showTips"
        class="mt-4"
        variant="secondary"
        icon="drag_indicator"
        role="note"
      >
        {{ t('home.dragHint') }}
      </AppCallout>

      <section v-if="availability.length" class="mt-6" aria-labelledby="home-history-title">
        <h2 id="home-history-title" class="mb-3 text-xl font-semibold tracking-tight">
          {{ t('home.historyTitle') }}
        </h2>
        <AvailabilityChart
          :title="t('home.availability')"
          :points="availability"
        />
      </section>

      <section v-if="attention.length" class="mt-6" aria-labelledby="home-attention-title">
        <h2 id="home-attention-title" class="mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span aria-hidden="true" class="material-symbols-rounded text-warn">error</span>
          {{ t('home.attentionTitle') }}
          <span class="rounded-full bg-surface-high px-2.5 py-0.5 text-xs text-on-surface-variant">
            {{ attention.length }}
          </span>
        </h2>

        <ul class="flex flex-col gap-2">
          <li
            v-for="tile in attention"
            :key="tile.service.id"
            class="flex min-w-0 items-center gap-3 rounded-2xl bg-surface-high p-3 text-on-surface-variant"
          >
            <ServiceStatus :state="tile.state" :show-label="false" />
            <m3e-button
              type="button"
              variant="text"
              class="min-w-0 flex-1"
              :class="tile.state === 'warn' ? 'text-center' : 'text-left'"
              @click="openService(tile.service.id)"
            >
              <span class="block truncate font-medium" :class="tile.state === 'warn' ? 'text-center' : 'text-left'">{{ serviceDisplayName(tile.service) }}</span>
              <span class="block truncate text-sm opacity-85" :class="tile.state === 'warn' ? 'text-center' : 'text-left'">
                {{ snaps.stateOf(tile.service.id)?.error || stateLabel(tile.state) }}
              </span>
            </m3e-button>
            <AppIconButton
              icon="refresh"
              :label="t('home.retryService', { name: serviceDisplayName(tile.service) })"
              :loading="!!snaps.stateOf(tile.service.id)?.loading"
              @click="snaps.refresh(tile.service.id)"
            />
          </li>
        </ul>
      </section>

      <section
        v-for="section in sections"
        :key="section.id"
        class="mt-8"
        @dragover="dragOverTarget(`section:${section.id}`, $event)"
        @drop="dropIntoSection(null, section.group, section.favorite, $event)"
      >
        <div class="mb-3 flex items-center gap-2">
          <h2 class="text-xl font-semibold tracking-tight">
            {{ section.label }}
          </h2>
          <span class="rounded-full bg-surface-high px-2.5 py-0.5 text-xs text-on-surface-variant">
            {{ section.tiles.length }}
          </span>
          <span
            v-if="ui.showTips && dropTargetId === `section:${section.id}`"
            class="ml-auto text-xs font-medium text-on-surface-variant"
          >
            {{ t('home.dropToGroup', { group: section.label }) }}
          </span>
        </div>

        <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4">
          <p
            v-if="ui.showTips && !section.tiles.length"
            class="col-span-full rounded-2xl border border-dashed border-outline-variant p-5 text-sm text-on-surface-variant"
          >
            {{ t('home.groupDrop') }}
          </p>

          <div
            v-for="tile in section.tiles"
            :key="tile.service.id"
            class="min-w-0"
            :class="{
              'opacity-55': draggingServiceId === tile.service.id,
              'rounded-[1.8rem] ring-2 ring-primary ring-offset-2 ring-offset-surface': dropTargetId === tile.service.id,
            }"
            @dragover.stop="dragOverTarget(tile.service.id, $event)"
            @drop.stop="dropIntoSection(tile.service.id, section.group, section.favorite, $event)"
          >
              <m3e-card
                variant="filled"
                actionable
                class="block min-h-56 cursor-pointer"
                :style="{
                  '--m3e-filled-card-container-color': tintOn(tile.meta.color, 20, 'var(--md-surface-container)'),
                  '--m3e-card-shape': '1.75rem',
                  '--m3e-card-padding': '1.25rem',
                }"
                @pointerdown="suppressCardClick = false"
                @click="openService(tile.service.id)"
              >
              <div slot="content" class="flex min-h-48 flex-col gap-4 text-left">
                <div class="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    class="material-symbols-rounded grid size-12 shrink-0 place-items-center rounded-2xl text-[24px]"
                    :style="{ background: tintOn(tile.meta.color, 40, 'var(--md-surface)'), color: tintOn(tile.meta.color, 75, 'var(--md-on-surface)') }"
                  >{{ tile.meta.icon }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-lg font-semibold">{{ serviceDisplayName(tile.service) }}</span>
                    <span class="block truncate text-xs text-on-surface-variant">{{ tile.meta.label }}</span>
                  </span>
                  <AppIconButton
                    size="small"
                    icon="drag_indicator"
                    :label="t('home.dragHandle', { name: serviceDisplayName(tile.service) })"
                    :draggable="true"
                    :show-tooltip="ui.showTips"
                    class="-mr-2 -mt-2 cursor-grab active:cursor-grabbing"
                    @click.stop
                    @dragstart="startDragging(tile.service.id, $event)"
                    @dragend="finishDragging"
                  />
                </div>

                <div class="min-w-0 rounded-2xl bg-surface/70 px-3 py-2.5">
                  <ServiceStatus
                    :state="tile.state"
                    :paused="tile.service.monitoringPaused"
                    class="text-sm font-medium"
                  />
                  <span
                    v-if="!ui.hideAddresses"
                    class="mt-1 block truncate text-xs text-on-surface-variant"
                    :title="tile.service.baseUrl"
                  >
                    {{ tile.service.baseUrl }}
                  </span>
                  <span
                    v-else
                    class="mt-1 flex items-center gap-1 truncate text-xs text-on-surface-variant"
                  >
                    <span aria-hidden="true" class="material-symbols-rounded text-sm text-on-surface-variant">visibility_off</span>
                    {{ t('privacy.hidden') }}
                  </span>
                </div>

                <div
                  v-if="snaps.stateOf(tile.service.id)?.data?.stats.length"
                  class="grid grid-cols-2 gap-2"
                >
                  <div
                    v-for="stat in snaps.stateOf(tile.service.id)?.data?.stats.slice(0, 2)"
                    :key="stat.label"
                    class="min-w-0 rounded-xl bg-surface/60 px-3 py-2"
                  >
                    <span class="block truncate text-[11px] text-on-surface-variant">
                      {{ stat.label }}
                    </span>
                    <span class="block truncate text-sm font-semibold">
                      {{ stat.value }}
                    </span>
                  </div>
                </div>

                <span class="mt-auto flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                  <span class="truncate">
                    {{ snaps.stateOf(tile.service.id)?.updatedAt
                      ? t('sv.updated', { ago: fmtAgo(snaps.stateOf(tile.service.id)?.updatedAt ?? 0, snaps.now) })
                      : t('home.waitingForCheck') }}
                  </span>
                  <span
                    v-if="ui.showTips && dropTargetId === tile.service.id"
                    class="shrink-0 font-medium text-primary"
                  >
                    {{ t('home.dropToReorder') }}
                  </span>
                </span>
              </div>
            </m3e-card>

            <div class="mt-1 flex flex-wrap items-center justify-between gap-1">
              <span v-if="ui.showTips" class="px-2 text-[11px] text-on-surface-variant">
                {{ t('home.reorderHint') }}
              </span>
              <span class="flex gap-1">
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
                  icon="keyboard_arrow_up"
                  :label="t('home.moveUp')"
                  :disabled="!services.list.slice(0, services.list.findIndex((service) => service.id === tile.service.id)).some((service) =>
                    service.favorite === tile.service.favorite
                    && (tile.service.favorite || (service.group?.trim().toLowerCase() ?? '') === (tile.service.group?.trim().toLowerCase() ?? '')),
                  )"
                  @click="moveService(tile.service.id, -1)"
                />
                <AppIconButton
                  size="extra-small"
                  icon="keyboard_arrow_down"
                  :label="t('home.moveDown')"
                  :disabled="!services.list.slice(services.list.findIndex((service) => service.id === tile.service.id) + 1).some((service) =>
                    service.favorite === tile.service.favorite
                    && (tile.service.favorite || (service.group?.trim().toLowerCase() ?? '') === (tile.service.group?.trim().toLowerCase() ?? '')),
                  )"
                  @click="moveService(tile.service.id, 1)"
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      <p
        v-if="selectedHealthFilter !== 'all' && !filteredTiles.length"
        class="mt-8 rounded-2xl bg-surface-container p-5 text-sm text-on-surface-variant"
        role="status"
      >
        {{ t('home.noFilterMatches') }}
      </p>

      <div class="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4">
        <m3e-card
          variant="outlined"
          actionable
          class="grid min-h-56 cursor-pointer place-items-center text-on-surface-variant transition hover:-translate-y-0.5"
          style="--m3e-card-shape: 1.75rem"
          @click="ui.openModal(null)"
        >
          <div slot="content" class="flex min-h-48 flex-col items-center justify-center gap-3">
            <span aria-hidden="true" class="material-symbols-rounded grid size-12 place-items-center rounded-full bg-surface-high text-[26px] text-on-surface-variant">add</span>
            <span class="font-medium">{{ t('service.add') }}</span>
          </div>
        </m3e-card>
      </div>
    </template>
  </div>
</template>
