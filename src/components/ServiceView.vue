<script setup lang="ts">
import { computed, watch } from 'vue'
import { META } from '../services/registry'
import type { ServiceConfig } from '../services/types'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { fmtAgo } from '../lib/format'
import { stateLabel, tintOn, visualState } from '../lib/status'
import { t } from '../lib/i18n'
import StatCard from './StatCard.vue'
import StatusDot from './StatusDot.vue'
import AppButton from './AppButton.vue'

const props = defineProps<{ service: ServiceConfig }>()
const snaps = useSnapshots()
const ui = useUi()
const tabs = useTabs()

const meta = computed(() => META[props.service.type])
const state = computed(() => snaps.stateOf(props.service.id))
const visual = computed(() => visualState(state.value))
const actions = computed(() => snaps.actionsFor(props.service.id))

watch(
  () => props.service.id,
  (id) => {
    if (!snaps.stateOf(id)?.data) snaps.refresh(id)
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <header class="flex flex-wrap items-center gap-5">
      <span aria-hidden="true"
        class="material-symbols-rounded grid size-16 shrink-0 place-items-center rounded-[22px] text-[32px]"
        :style="{ background: tintOn(meta.color, 40, 'var(--md-surface)'), color: tintOn(meta.color, 75, 'var(--md-on-surface)') }"
      >{{ meta.icon }}</span>

      <div class="min-w-0 flex-1">
        <h1 class="truncate text-3xl font-semibold tracking-tight">{{ service.name }}</h1>
        <p class="truncate text-sm text-on-surface-variant">{{ ui.hideAddresses ? meta.label : t('sv.on', { type: meta.label, url: service.baseUrl }) }}</p>
      </div>

      <div class="flex flex-col items-end gap-1">
        <span class="flex items-center gap-2 rounded-full bg-surface-high px-4 py-1.5 text-sm font-medium">
          <StatusDot :state="visual" />
          {{ stateLabel(visual) }}
        </span>
        <span v-if="state?.updatedAt" class="text-xs text-on-surface-variant">
          {{ t('sv.updated', { ago: fmtAgo(state.updatedAt, snaps.now) }) }}
        </span>
      </div>
    </header>

    <div v-if="actions.length" class="mt-6 flex flex-wrap gap-2">

        <AppButton
          v-for="a in actions"
          :key="a.id"
          variant="tonal"
          :icon="a.icon"
          :loading="!!snaps.busyActions[`${service.id}:${a.id}`]"
          @click="snaps.runAction(service.id, a)"
        >
          {{ a.label }}
        </AppButton>

    </div>

    <!-- Erro -->
    <div
      v-if="state?.error"
      class="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-error-container p-5 text-on-error-container"
      role="alert"
    >
      <span aria-hidden="true" class="material-symbols-rounded text-[32px]">cloud_off</span>
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ t('sv.errTitle') }}</p>
        <p class="text-sm opacity-90">{{ state.error }}</p>
        <p v-if="state.data" class="mt-1 text-xs opacity-80">{{ t('sv.stale') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton
          variant="text"
          icon="edit"
          @click="ui.openModal(service.id)"
        >
          {{ t('service.edit') }}
        </AppButton>

        <AppButton
          variant="tonal"
          icon="refresh"
          @click="snaps.refresh(service.id)"
        >
          {{ t('sv.retry') }}
        </AppButton>
      </div>
    </div>

    <!-- Cards -->
    <div class="mt-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      <template v-if="state?.data">
        <StatCard v-for="s in state.data.stats" :key="s.label" :stat="s" />
      </template>
      <template v-else-if="!state?.error">
        <div v-for="n in 4" :key="n" class="min-h-36 animate-pulse rounded-3xl bg-surface-high" />
      </template>
    </div>

    <p v-if="state?.data && !tabs.panelOpen" class="mt-6 text-sm text-on-surface-variant">
      {{ t('sv.panelHint', { title: state.data.itemsTitle }) }}
    </p>
  </div>
</template>
