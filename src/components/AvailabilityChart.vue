<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { locale } from '../lib/i18n'
import type { AvailabilityPoint } from '../lib/history'
import type { Health } from '../services/types'

const props = defineProps<{
  title: string
  points: AvailabilityPoint[]
}>()

const { t } = useI18n()
const periodTotals = computed(() =>
  props.points.reduce(
    (totals, point) => ({
      ok: totals.ok + point.ok,
      warn: totals.warn + point.warn,
      bad: totals.bad + point.bad,
    }),
    { ok: 0, warn: 0, bad: 0 },
  ),
)
const periodTotal = computed(() => total(periodTotals.value))

const breakdown = computed(() => [
  { key: 'ok' as const, label: t('home.availabilityGood'), class: 'bg-ok' },
  { key: 'warn' as const, label: t('home.availabilityWarning'), class: 'bg-warn' },
  { key: 'bad' as const, label: t('home.availabilityBad'), class: 'bg-bad' },
])

const hourLabels = computed(() => {
  const lastIndex = props.points.length - 1
  if (lastIndex < 0) return []

  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const index = Math.round(lastIndex * fraction)
    const point = props.points[index]
    return point
      ? {
          at: point.at,
          index,
          position: `${(index / Math.max(1, lastIndex)) * 100}%`,
        }
      : null
  }).filter((label): label is NonNullable<typeof label> => label !== null)
})

const formattedValue = computed(() =>
  !periodTotal.value
    ? '—'
    : `${percentage(periodTotals.value.ok, periodTotal.value)}%`,
)

function total(point: Pick<AvailabilityPoint, 'ok' | 'warn' | 'bad'>) {
  return point.ok + point.warn + point.bad
}

function percentage(value: number, denominator: number) {
  return denominator
    ? new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 })
        .format(Math.round((value / denominator) * 100))
    : '0'
}

function segmentStyle(point: AvailabilityPoint, key: Health) {
  const count = total(point)
  return { height: count ? `${(point[key] / count) * 100}%` : '0%' }
}

function pointLabel(point: AvailabilityPoint) {
  const time = new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(point.at)
  const count = total(point)
  if (!count) return `${time}: ${t('history.noData')}`

  return [
    time,
    t('home.availabilityChecks', { count }),
    ...breakdown.value.map(({ key, label }) =>
      `${label}: ${percentage(point[key], count)}%`,
    ),
  ].join(' · ')
}

function hourLabel(at: number) {
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(at)
}
</script>

<template>
  <m3e-card
    variant="filled"
    class="block overflow-hidden"
    style="
      --m3e-filled-card-container-color: var(--md-surface-high);
      --m3e-card-shape: 1.5rem;
      --m3e-card-padding: 0;
    "
  >
    <article slot="content" class="min-w-0 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-primary"
          >
            <m3e-icon name="monitoring" variant="rounded" />
          </span>
          <div class="min-w-0">
            <h3 class="truncate font-semibold" :title="title">
              {{ title }}
            </h3>
            <p class="mt-0.5 text-sm text-on-surface-variant">
              {{ t('home.availabilityPeriod') }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl bg-surface-container px-3 py-1.5 text-right">
          <span class="block text-2xl font-semibold tracking-tight">{{ formattedValue }}</span>
          <span class="block text-[11px] text-on-surface-variant">
            {{ t('home.availabilityOnlineRate') }}
          </span>
        </div>
      </div>

      <div
        class="mt-5 rounded-2xl bg-surface-container/70 px-3 pt-4 pb-3 sm:px-5"
        role="img"
        :aria-label="t('history.chartLabel', { title })"
      >
        <div class="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <div class="relative h-28 text-[10px] leading-none text-on-surface-variant" aria-hidden="true">
            <span class="absolute top-0">100%</span>
            <span class="absolute top-1/2 -translate-y-1/2">50%</span>
            <span class="absolute bottom-0">0%</span>
          </div>

          <div class="relative h-28">
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 flex flex-col justify-between"
            >
              <span
                v-for="level in 5"
                :key="level"
                class="border-t border-dashed border-outline-variant/50"
              />
            </div>

            <div class="relative grid h-full grid-cols-[repeat(24,minmax(0,1fr))] items-stretch gap-1">
              <span
                v-for="point in points"
                :key="point.at"
                class="relative flex h-full min-w-0 flex-col-reverse overflow-hidden rounded-sm bg-surface-high"
                :title="pointLabel(point)"
                aria-hidden="true"
              >
                <span
                  v-for="item in breakdown"
                  :key="item.key"
                  class="w-full transition-[height] duration-500 ease-out"
                  :class="item.class"
                  :style="segmentStyle(point, item.key)"
                />
                <span
                  v-if="!total(point)"
                  class="absolute inset-x-0 top-1/2 border-t border-dashed border-on-surface-variant/40"
                />
              </span>
            </div>
          </div>

          <div class="relative col-start-2 mt-2 h-4 text-[11px] text-on-surface-variant">
            <span
              v-for="(label, index) in hourLabels"
              :key="label.at"
              class="absolute whitespace-nowrap"
              :style="{
                left: label.position,
                transform: index === 0
                  ? 'translateX(0)'
                  : index === hourLabels.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
              }"
            >
              {{ hourLabel(label.at) }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">
        <span
          v-for="item in breakdown"
          :key="item.key"
          class="inline-flex items-center gap-2"
        >
          <span class="size-2 rounded-full" :class="item.class" aria-hidden="true" />
          {{ item.label }}
          <span class="font-medium text-on-surface">
            {{ periodTotal ? `${percentage(periodTotals[item.key], periodTotal)}%` : '—' }}
          </span>
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="size-2 rounded-full bg-on-surface-variant/20" aria-hidden="true" />
          {{ t('history.noData') }}
        </span>
      </div>
    </article>
  </m3e-card>
</template>
