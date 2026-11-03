<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { VisualState } from '../../lib/status'
import StatusDot from './StatusDot.vue'

export type ServiceHealthFilter = VisualState | 'paused' | 'all'
export type ServiceHealthCounts = Record<Exclude<ServiceHealthFilter, 'all'>, number>

const props = defineProps<{
  counts: ServiceHealthCounts
  selected: ServiceHealthFilter
}>()

const emit = defineEmits<{
  select: [filter: ServiceHealthFilter]
}>()

const { t } = useI18n()

const options: {
  filter: Exclude<ServiceHealthFilter, 'all'>
  state?: VisualState
  label: string
}[] = [
  { filter: 'ok', state: 'ok', label: 'state.ok' },
  { filter: 'warn', state: 'warn', label: 'state.warn' },
  { filter: 'bad', state: 'bad', label: 'state.bad' },
  { filter: 'loading', state: 'loading', label: 'state.loading' },
  { filter: 'paused', label: 'settings.monitoringPaused' },
]

function select(filter: Exclude<ServiceHealthFilter, 'all'>) {
  emit('select', props.selected === filter ? 'all' : filter)
}
</script>

<template>
  <div role="group" :aria-label="t('home.healthSummary')" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    <button
      v-for="option in options"
      :key="option.filter"
      type="button"
      class="flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="selected === option.filter
        ? 'border-primary bg-primary-container text-on-primary-container'
        : 'border-outline-variant bg-surface-container text-on-surface hover:bg-surface-high'"
      :aria-pressed="selected === option.filter"
      @click="select(option.filter)"
    >
      <StatusDot v-if="option.state" :state="option.state" decorative />
      <span
        v-else
        aria-hidden="true"
        class="material-symbols-rounded text-base text-on-surface-variant"
      >pause_circle</span>
      <span class="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
        {{ t(option.label) }}
      </span>
      <span class="shrink-0 text-sm font-semibold tabular-nums">
        {{ counts[option.filter] }}
      </span>
    </button>
  </div>
</template>
