
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { SETTINGS_ID, useTabs } from '../stores/tabs'
import { tintOn, visualState } from '../lib/status'
import { serviceDisplayName } from '../lib/service'
import StatusDot from './ui/StatusDot.vue'
import AppButton from './ui/AppButton.vue'
import AppIconButton from './ui/AppIconButton.vue'

const tabs = useTabs()
const { t } = useI18n()
const services = useServices()
const snaps = useSnapshots()

const editing = ref(false)
const draggingServiceId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)

type SidebarRow =
  | { kind: 'group'; id: string; name: string; groupKey: string }
  | {
      kind: 'tab'
      id: string
      serviceId: string | null
      groupKey: string | null
      name: string
      icon: string
      color: string | null
      state: ReturnType<typeof visualState> | null
    }

const rows = computed<SidebarRow[]>(() => {
  const serviceTabs = tabs.tabs.flatMap((tab) => {
    const service = services.get(tab.serviceId)
    if (!service) return []

    const groupName = services.groups.find(
      (group) => group.toLowerCase() === service.group?.trim().toLowerCase(),
    )

    return [{
      kind: 'tab' as const,
      id: tab.id,
      serviceId: service.id,
      groupKey: groupName ?? '',
      name: serviceDisplayName(service),
      icon: META[service.type].icon,
      color: META[service.type].color,
      state: service.monitoringPaused ? null : visualState(snaps.stateOf(service.id)),
      serviceOrder: services.list.findIndex((item) => item.id === service.id),
    }]
  })

  const ordered: SidebarRow[] = []
  const visibleGroups = [
    ...services.groups.filter((group) => serviceTabs.some((row) => row.groupKey === group)),
    ...(serviceTabs.some((row) => row.groupKey === '') ? [''] : []),
  ]

  for (const group of visibleGroups) {
    ordered.push({
      kind: 'group',
      id: `group:${group}`,
      name: group || t('home.group.other'),
      groupKey: group,
    })
    ordered.push(
      ...serviceTabs
        .filter((row) => row.groupKey === group)
        .sort((a, b) => a.serviceOrder - b.serviceOrder),
    )
  }

  for (const tab of tabs.tabs) {
    if (tab.serviceId && tab.serviceId !== SETTINGS_ID) continue
    ordered.push({
      kind: 'tab',
      id: tab.id,
      serviceId: null,
      groupKey: null,
      name: tab.serviceId === SETTINGS_ID ? t('settings.title') : t('tab.home'),
      icon: tab.serviceId === SETTINGS_ID ? 'settings' : 'grid_view',
      color: null,
      state: null,
    })
  }

  return ordered
})

function toggleEditing() {
  editing.value = !editing.value
}

function moveUp(id: string) {
  const row = rows.value.find((item) => item.id === id)
  if (!row || row.kind !== 'tab') return

  const peers = rows.value.filter(
    (item): item is Extract<SidebarRow, { kind: 'tab' }> =>
      item.kind === 'tab' && item.groupKey === row.groupKey,
  )
  const index = peers.findIndex((item) => item.id === id)
  const previous = peers[index - 1]
  if (!previous) return

  if (row.serviceId && previous.serviceId) services.moveWithinGroup(row.serviceId, -1)
  else tabs.moveBefore(row.id, previous.id)
}

function moveDown(id: string) {
  const row = rows.value.find((item) => item.id === id)
  if (!row || row.kind !== 'tab') return

  const peers = rows.value.filter(
    (item): item is Extract<SidebarRow, { kind: 'tab' }> =>
      item.kind === 'tab' && item.groupKey === row.groupKey,
  )
  const index = peers.findIndex((item) => item.id === id)
  const next = peers[index + 1]
  if (!next) return

  if (row.serviceId && next.serviceId) services.moveWithinGroup(row.serviceId, 1)
  else tabs.moveBefore(next.id, row.id)
}

function canMove(id: string, offset: -1 | 1) {
  const row = rows.value.find((item) => item.id === id)
  if (!row || row.kind !== 'tab') return false
  const peers = rows.value.filter(
    (item): item is Extract<SidebarRow, { kind: 'tab' }> =>
      item.kind === 'tab' && item.groupKey === row.groupKey,
  )
  return peers[peers.findIndex((item) => item.id === id) + offset] !== undefined
}

function startDragging(serviceId: string, event: DragEvent) {
  draggingServiceId.value = serviceId
  dropTargetId.value = null
  event.dataTransfer?.setData('text/plain', serviceId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dragOverRow(row: SidebarRow, event: DragEvent) {
  if (!editing.value || row.kind !== 'tab' || !row.serviceId) return
  event.preventDefault()
  dropTargetId.value = row.id
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function dropOnRow(row: SidebarRow, event: DragEvent) {
  const serviceId = event.dataTransfer?.getData('text/plain')
  if (!editing.value || row.kind !== 'tab' || !row.serviceId || !serviceId) return

  const dragged = services.get(serviceId)
  const target = services.get(row.serviceId)
  if (dragged && target && dragged.id !== target.id) {
    services.organize(serviceId, target.id, {
      favorite: dragged.favorite ?? false,
      group: target.group,
    })
  }
  finishDragging()
}

function dragOverGroup(group: string, event: DragEvent) {
  if (!editing.value || !draggingServiceId.value) return
  event.preventDefault()
  dropTargetId.value = `group:${group}`
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function dropOnGroup(group: string, event: DragEvent) {
  const serviceId = event.dataTransfer?.getData('text/plain')
  if (!editing.value || !serviceId) return

  const service = services.get(serviceId)
  if (service) {
    services.organize(serviceId, null, {
      favorite: service.favorite ?? false,
      group: group || undefined,
    })
  }
  finishDragging()
}

function finishDragging() {
  draggingServiceId.value = null
  dropTargetId.value = null
}
</script>

<template>
  <aside
    class="tab-sidebar flex w-64 shrink-0 flex-col gap-1 rounded-[28px] bg-surface p-3 transition-colors duration-500"
    :aria-label="t('tab.list')"
  >
    <div
      data-tauri-drag-region
      class="flex items-center gap-3 px-2 pt-2 pb-3"
    >
      <span
        class="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-high p-1.5"
      >
        <img
          src="/selfhub.png"
          alt=""
          class="size-full object-contain"
        />
      </span>

      <span class="min-w-0 flex-1 text-lg font-semibold tracking-tight">
        SelfHub
      </span>

      <AppIconButton
        size="medium"
        :icon="editing ? 'done' : 'reorder'"
        :label="editing ? t('tab.finishOrganizing') : t('tab.organize')"
        :variant="editing ? 'tonal' : 'standard'"
        :pressed="editing"
        @click="toggleEditing"
      />
    </div>

    <p
      v-if="editing"
      class="mx-1 mb-2 rounded-2xl bg-surface-high px-3 py-2 text-xs leading-relaxed text-on-surface-variant"
      role="note"
    >
      {{ t('tab.organizeHint') }}
    </p>

    <nav
      class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      role="tablist"
      aria-orientation="vertical"
    >
      <div
        v-for="row in rows"
        :key="row.id"
      >
        <p
          v-if="row.kind === 'group'"
          class="rounded-xl px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-on-surface-variant transition-colors"
          :class="dropTargetId === `group:${row.groupKey}` ? 'bg-primary-container text-on-primary-container' : ''"
          @dragover.prevent="dragOverGroup(row.groupKey, $event)"
          @drop.prevent.stop="dropOnGroup(row.groupKey, $event)"
        >
          <span class="flex items-center justify-between gap-2">
            {{ row.name }}
            <span v-if="editing" class="font-normal normal-case">
              {{ t('tab.dropIntoGroup') }}
            </span>
          </span>
        </p>

        <div
          v-else
          class="group relative flex items-center rounded-full transition-colors"
          :class="
            dropTargetId === row.id
              ? 'bg-primary-container text-on-primary-container ring-2 ring-primary'
              : row.id === tabs.activeId
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-high'
          "
          @dragover="dragOverRow(row, $event)"
          @drop.prevent.stop="dropOnRow(row, $event)"
        >
        <button
          type="button"
          role="tab"
          :aria-selected="row.id === tabs.activeId"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-full py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="editing ? 'pr-1 pl-2' : 'pr-10 pl-2'"
          @click="!draggingServiceId && tabs.activate(row.id)"
        >
          <span
            aria-hidden="true"
            class="material-symbols-rounded relative grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
            :style="
              row.color
                ? {
                    background: tintOn(row.color, 38, 'var(--md-surface)'),
                    color: tintOn(row.color, 70, 'var(--md-on-surface)'),
                  }
                : {
                    background: 'var(--md-surface-high)',
                  }
            "
          >
            {{ row.icon }}

            <StatusDot
              v-if="row.state"
              :state="row.state"
              class="absolute -right-0.5 -top-0.5 ring-2 ring-surface"
            />
          </span>

          <span class="truncate">
            {{ row.name }}
          </span>
        </button>

        <!-- Controles de edição -->
        <div
          v-if="editing"
          class="flex shrink-0 items-center gap-0.5 pr-1"
        >
          <AppIconButton
            v-if="row.serviceId"
            size="extra-small"
            icon="drag_indicator"
            :label="t('tab.dragService', { name: row.name })"
            :draggable="true"
            class="cursor-grab active:cursor-grabbing"
            @click.stop
            @dragstart="row.serviceId && startDragging(row.serviceId, $event)"
            @dragend="finishDragging"
          />

          <AppIconButton
            size="extra-small"
            icon="keyboard_arrow_up"
            :label="row.serviceId
              ? t('tab.moveServiceUp', { name: row.name })
              : t('tab.moveUp')"
            :disabled="!canMove(row.id, -1)"
            @click.stop="moveUp(row.id)"
          />

          <AppIconButton
            size="extra-small"
            icon="keyboard_arrow_down"
            :label="row.serviceId
              ? t('tab.moveServiceDown', { name: row.name })
              : t('tab.moveDown')"
            :disabled="!canMove(row.id, 1)"
            @click.stop="moveDown(row.id)"
          />
        </div>

        <!-- Fechar -->
        <AppIconButton
          v-else
          size="extra-small"
          icon="close"
          :label="t('tab.close', { name: row.name })"
          class="absolute right-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          @click.stop="tabs.close(row.id)"
        />
        </div>
      </div>
    </nav>

    <AppButton
      class="mt-2 w-full"
      variant="tonal"
      size="medium"
      icon="add"
      @click="tabs.openNewTab()"
    >
      {{ t('tab.new') }}
    </AppButton>

    <AppButton
      class="mt-1 w-full justify-start"
      :variant="tabs.isSettings ? 'tonal' : 'text'"
      :aria-current="tabs.isSettings ? 'page' : undefined"
      icon="settings"
      @click="tabs.openSettings()"
    >
      {{ t('settings.title') }}
    </AppButton>
  </aside>
</template>
