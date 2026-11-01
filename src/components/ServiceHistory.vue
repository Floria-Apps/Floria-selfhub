<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HistorySample } from '../lib/history'
import HistoryChart from './HistoryChart.vue'

const props = defineProps<{ samples: HistorySample[]; now: number }>()
const { t } = useI18n()
const historyRange = 7 * 24 * 60 * 60 * 1000
const slotDuration = historyRange / 48

const recentSamples = computed(() =>
  props.samples
    .filter((sample) =>
      sample.at >= props.now - historyRange && sample.at <= props.now,
    )
    .sort((a, b) => a.at - b.at),
)

const metrics = computed(() => {
  const indexes = [...new Set(recentSamples.value.flatMap((sample) => sample.stats.map((stat) => stat.index)))]

  return indexes.slice(0, 3).flatMap((index) => {
    const latest = [...recentSamples.value].reverse()
      .flatMap((sample) => sample.stats)
      .find((stat) => stat.index === index)
    if (!latest) return []

    const points = recentSamples.value.flatMap((sample) => {
      const stat = sample.stats.find((entry) => entry.index === index)
      return stat ? [{ at: sample.at, value: stat.value }] : []
    })

    return [{ label: latest.label, points, unit: latest.unit }]
  })
})

const timeline = computed(() => Array.from({ length: 48 }, (_, index) => {
  const start = props.now - historyRange + index * slotDuration
  const end = start + slotDuration
  const inSlot = recentSamples.value.filter((entry) => entry.at >= start && entry.at < end)

  return { start, sample: inSlot[inSlot.length - 1] }
}))

function statusClass(health: HistorySample['health']) {
  return {
    'bg-ok': health === 'ok',
    'bg-warn': health === 'warn',
    'bg-bad': health === 'bad',
  }
}
</script>

<template>
  <section class="mt-8" aria-labelledby="service-history-title">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="service-history-title" class="text-xl font-semibold tracking-tight">
        {{ t('history.title') }}
      </h2>
      <span v-if="recentSamples.length" class="text-sm text-on-surface-variant">
        {{ t('history.samples', { count: recentSamples.length }) }}
      </span>
    </div>

    <p v-if="!recentSamples.length" class="rounded-2xl bg-surface-high p-4 text-sm text-on-surface-variant">
      {{ t('history.empty') }}
    </p>

    <template v-else>
      <div
        class="mb-3 grid min-h-9 grid-cols-[repeat(48,minmax(0,1fr))] gap-1 rounded-2xl bg-surface-high px-3 py-2"
        role="img"
        :aria-label="t('history.timelineLabel')"
      >
        <span
          v-for="slot in timeline"
          :key="slot.start"
          class="h-4 min-w-0 rounded-sm"
          :class="slot.sample ? statusClass(slot.sample.health) : 'bg-surface'"
          :title="slot.sample ? new Date(slot.sample.at).toLocaleString() : t('history.noData')"
        />
      </div>

      <div v-if="metrics.length" class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
        <HistoryChart
          v-for="metric in metrics"
          :key="metric.label"
          :title="metric.label"
          :points="metric.points"
          :now="props.now"
          :time-range-ms="historyRange"
          :gap-threshold-ms="10 * 60 * 1000"
          :unit="metric.unit"
        />
      </div>
    </template>
  </section>
</template>
