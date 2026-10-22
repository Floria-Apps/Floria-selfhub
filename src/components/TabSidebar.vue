<script setup lang="ts">
import { computed, ref } from 'vue'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { SETTINGS_ID, useTabs } from '../stores/tabs'
import { tintOn, visualState } from '../lib/status'
import { t } from '../lib/i18n'
import StatusDot from './StatusDot.vue'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()

const editing = ref(false)

const rows = computed(() =>
  tabs.tabs.map((tab, index) => {
    const s = services.get(tab.serviceId)

    return s
      ? {
          id: tab.id,
          name: s.name,
          icon: META[s.type].icon,
          color: META[s.type].color as string | null,
          state: visualState(snaps.stateOf(s.id)),
          index,
        }
      : tab.serviceId === SETTINGS_ID
        ? {
            id: tab.id,
            name: t('settings.title'),
            icon: 'settings',
            color: null,
            state: null,
            index,
          }
        : {
            id: tab.id,
            name: t('tab.new'),
            icon: 'grid_view',
            color: null,
            state: null,
            index,
          }
  }),
)

function toggleEditing() {
  editing.value = !editing.value
}

function moveUp(id: string) {
  tabs.moveUp(id)
}

function moveDown(id: string) {
  tabs.moveDown(id)
}
</script>

<template>
  <aside
    class="flex w-64 shrink-0 flex-col gap-1 rounded-[28px] bg-surface p-3 transition-colors duration-500"
    :aria-label="t('tab.list')"
  >
    <div
      data-tauri-drag-region
      class="flex items-center gap-3 px-2 pt-2 pb-3"
    >
      <span
        aria-hidden="true"
        class="material-symbols-rounded grid size-10 place-items-center rounded-2xl bg-primary text-[22px] text-on-primary"
      >
        hub
      </span>

      <span class="min-w-0 flex-1 text-lg font-semibold tracking-tight">
        SelfHub
      </span>

      <AppIconButton
        :icon="editing ? 'check' : 'edit'"
        :label="editing ? 'Concluir edição' : 'Editar abas'"
        :variant="editing ? 'tonal' : 'standard'"
        :pressed="editing"
        @click="toggleEditing"
      />
    </div>

    <nav
      class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      role="tablist"
      aria-orientation="vertical"
    >
      <div
        v-for="row in rows"
        :key="row.id"
        class="group relative flex items-center rounded-full transition-colors"
        :class="
          row.id === tabs.activeId
            ? 'bg-secondary-container text-on-secondary-container'
            : 'text-on-surface-variant hover:bg-surface-high'
        "
      >

          <button
            type="button"
            role="tab"
            :aria-selected="row.id === tabs.activeId"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-full py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="editing ? 'pr-1 pl-2' : 'pr-10 pl-2'"
            @click="tabs.activate(row.id)"
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
                class="absolute -right-0.5 -bottom-0.5 ring-2 ring-surface"
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
              size="extra-small"
              icon="keyboard_arrow_up"
              label="Mover para cima"
              :disabled="row.index === 0"
              @click.stop="moveUp(row.id)"
            />

            <AppIconButton
              size="extra-small"
              icon="keyboard_arrow_down"
              label="Mover para baixo"
              :disabled="row.index === rows.length - 1"
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
    </nav>


    <AppButton
      class="mt-2 w-full"
      variant="tonal"
      size="large"
      icon="add"
      @click="tabs.openNewTab()"
    >
      {{ t('tab.new') }}
    </AppButton>


    <button
      type="button"
      class="mt-1 flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="
        tabs.isSettings
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant hover:bg-surface-high'
      "
      :aria-current="tabs.isSettings ? 'page' : undefined"
      @click="tabs.openSettings()"
    >
      <span
        aria-hidden="true"
        class="material-symbols-rounded text-[20px]"
      >
        settings
      </span>

      {{ t('settings.title') }}
    </button>
  </aside>
</template>