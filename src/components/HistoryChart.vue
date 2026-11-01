<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { locale } from '../lib/i18n'

const props = defineProps<{
  title: string
  points: { at: number; value: number }[]
  now: number
  timeRangeMs: number
  gapThresholdMs: number
  unit?: string
  decimals?: number
}>()

const { t } = useI18n()
const latest = computed(() => props.points[props.points.length - 1]?.value)
const valueFormatter = computed(() => new Intl.NumberFormat(locale.value, {
  maximumFractionDigits: props.decimals ?? 1,
}))

function formatValue(value: number) {
  const formatted = valueFormatter.value.format(value)
  return `${formatted}${props.unit === '%' ? '%' : props.unit ? ` ${props.unit}` : ''}`
}

const formattedValue = computed(() =>
  latest.value == null ? '—' : formatValue(latest.value),
)

const valueBounds = computed(() => {
  if (!props.points.length) return null

  const values = props.points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = max === min ? Math.max(Math.abs(max) * 0.05, 1) : (max - min) * 0.08

  const lower = min >= 0 ? Math.max(0, min - padding) : min - padding
  const upper = props.unit === '%' && max <= 100
    ? Math.min(100, max + padding)
    : max + padding

  return { min: lower, max: upper }
})

const timeBounds = computed(() => {
  if (!props.points.length) return null

  const minRange = 60 * 60 * 1000
  const first = Math.min(...props.points.map((point) => point.at))
  const last = Math.max(...props.points.map((point) => point.at))
  const padding = Math.max((last - first) * 0.1, minRange * 0.05)
  const earliest = Math.max(props.now - props.timeRangeMs, first - padding)
  const end = Math.min(props.now, Math.max(last + padding, earliest + minRange))
  const range = Math.min(
    props.timeRangeMs,
    Math.max(minRange, end - earliest),
  )
  const start = Math.max(props.now - props.timeRangeMs, end - range)

  return { start, end, range: end - start }
})

const timeLabels = computed(() => {
  const bounds = timeBounds.value
  if (!bounds) return ['', '']

  const shortRange = bounds.range < 24 * 60 * 60 * 1000
  const formatter = new Intl.DateTimeFormat(locale.value, {
    ...(shortRange
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short' }),
  })

  return [
    formatter.format(bounds.start),
    formatter.format(bounds.end),
  ]
})

const coordinates = computed(() => {
  const bounds = valueBounds.value
  const time = timeBounds.value
  if (!bounds || !time) return []

  return props.points.map((point) => {
    const elapsed = Math.max(0, Math.min(time.range, point.at - time.start))
    const x = 8 + (elapsed / time.range) * 304
    const y = 76 - ((point.value - bounds.min) / (bounds.max - bounds.min)) * 64
    return { x, y, at: point.at, value: point.value }
  })
})

const segments = computed(() => {
  const result: { x: number; y: number; at: number }[][] = []

  for (const point of coordinates.value) {
    const current = result[result.length - 1]
    const previous = current?.[current.length - 1]
    if (!current || (previous && point.at - previous.at > props.gapThresholdMs)) {
      result.push([point])
    } else {
      current.push(point)
    }
  }

  return result
})

const markers = computed(() => {
  const points = coordinates.value
  if (points.length <= 60) return points

  const stride = Math.ceil(points.length / 60)
  return points.filter((_, index) => index % stride === 0 || index === points.length - 1)
})
</script>

<template>
  <article class="min-w-0 rounded-2xl bg-surface-high p-4">
    <div class="flex items-start justify-between gap-3">
      <h3 class="truncate text-sm font-medium text-on-surface-variant" :title="title">
        {{ title }}
      </h3>
      <span class="shrink-0 rounded-xl bg-surface-container px-2.5 py-1 text-lg font-semibold">
        {{ formattedValue }}
      </span>
    </div>
    <div v-if="coordinates.length && valueBounds" class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <div class="relative h-20 text-[10px] leading-none text-on-surface-variant" aria-hidden="true">
        <span class="absolute top-0">{{ formatValue(valueBounds.max) }}</span>
        <span class="absolute bottom-0">{{ formatValue(valueBounds.min) }}</span>
      </div>

      <svg
        class="block h-20 w-full overflow-visible text-primary"
        viewBox="0 0 320 88"
        preserveAspectRatio="none"
        role="img"
        :aria-label="t('history.chartLabel', { title })"
      >
        <line
          v-for="y in [12, 44, 76]"
          :key="y"
          x1="8"
          :y1="y"
          x2="312"
          :y2="y"
          stroke="currentColor"
          :opacity="y === 76 ? '.22' : '.10'"
          stroke-dasharray="3 5"
        />
        <g v-for="(segment, index) in segments" :key="index">
          <polygon
            v-if="segment.length > 1"
            :points="`${segment[0]!.x},76 ${segment.map(({ x, y }) => `${x},${y}`).join(' ')} ${segment[segment.length - 1]!.x},76`"
            fill="currentColor"
            opacity=".08"
          />
          <polyline
            :points="segment.map(({ x, y }) => `${x},${y}`).join(' ')"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>
        <circle
          v-for="point in markers"
          :key="point.at"
          :cx="point.x"
          :cy="point.y"
          :r="point === coordinates[coordinates.length - 1] ? 4 : 2"
          fill="currentColor"
        >
          <title>{{ new Date(point.at).toLocaleString(locale) }} · {{ formatValue(point.value) }}</title>
        </circle>
        <title>{{ title }}: {{ formattedValue }}</title>
      </svg>

      <div class="col-start-2 mt-1 flex justify-between text-[10px] text-on-surface-variant">
        <span>{{ timeLabels[0] }}</span>
        <span>{{ timeLabels[1] }}</span>
      </div>
    </div>
    <p v-else class="mt-3 text-sm text-on-surface-variant">
      {{ t('history.empty') }}
    </p>
  </article>
</template>
