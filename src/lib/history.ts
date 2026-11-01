import { locale } from './i18n'
import type { Health, ServiceSnapshot } from '../services/types'

export interface HistoryStat {
  index: number
  label: string
  value: number
  unit: string
}

export interface HistorySample {
  at: number
  health: Health
  stats: HistoryStat[]
}

export interface AvailabilityPoint {
  at: number
  ok: number
  warn: number
  bad: number
}

export const HISTORY_LIMIT = 2016
export const HISTORY_RETENTION = 7 * 24 * 60 * 60 * 1000
export const HISTORY_SAMPLE_INTERVAL = 5 * 60 * 1000
export const AVAILABILITY_HOURS = 24

export function buildAvailabilitySeries(
  services: { id: string; monitoringPaused?: boolean }[],
  historyOf: (id: string) => HistorySample[],
  now: number,
): AvailabilityPoint[] {
  const end = Math.floor(now / 3_600_000) * 3_600_000
  const points = Array.from({ length: AVAILABILITY_HOURS }, (_, index) => ({
    at: end - (AVAILABILITY_HOURS - 1 - index) * 3_600_000,
    ok: 0,
    warn: 0,
    bad: 0,
  }))

  for (const service of services) {
    if (service.monitoringPaused) continue

    const latest = Array.from(
      { length: AVAILABILITY_HOURS },
      (): { at: number; health: Health } | undefined => undefined,
    )
    for (const sample of historyOf(service.id)) {
      const index = Math.floor((sample.at - points[0]!.at) / 3_600_000)
      const point = points[index]
      if (!point || sample.at < point.at || sample.at >= point.at + 3_600_000) continue
      if (!latest[index] || sample.at > latest[index]!.at) {
        latest[index] = sample
      }
    }

    for (let index = 0; index < latest.length; index++) {
      const sample = latest[index]
      if (sample) points[index]![sample.health]++
    }
  }

  return points
}

export function parseStatValue(value: string): Pick<HistoryStat, 'value' | 'unit'> | null {
  const match = value.trim().match(/^([+-]?\d[\d.,\u00a0\u202f ]*)(?:\s*(%|ms|Mbps))?$/i)
  if (!match?.[1]) return null

  const numberFormat = new Intl.NumberFormat(locale.value)
  const parts = numberFormat.formatToParts(12345.6)
  const group = parts.find((part) => part.type === 'group')?.value
  const decimal = parts.find((part) => part.type === 'decimal')?.value
  let normalized = match[1].trim()

  if (group) normalized = normalized.split(group).join('')
  if (decimal && decimal !== '.') normalized = normalized.replace(decimal, '.')
  normalized = normalized.replace(/[\u00a0\u202f ]/g, '')

  const parsed = Number(normalized)
  return Number.isFinite(parsed)
    ? { value: parsed, unit: match[2] ?? '' }
    : null
}

export function makeHistorySample(
  snapshot: ServiceSnapshot | undefined,
  at: number,
  failed = false,
): HistorySample {
  return {
    at,
    health: failed ? 'bad' : snapshot?.health ?? 'bad',
    stats: (snapshot?.stats ?? []).flatMap((stat, index) => {
      const parsed = parseStatValue(stat.value)
      return parsed ? [{ index, label: stat.label, ...parsed }] : []
    }),
  }
}

export function normalizeHistory(
  raw: unknown,
  serviceIds: string[],
  now = Date.now(),
): Record<string, HistorySample[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: Record<string, HistorySample[]> = {}
  const source = raw as Record<string, unknown>
  const knownIds = new Set(serviceIds)

  for (const [id, value] of Object.entries(source)) {
    if (!knownIds.has(id) || !Array.isArray(value)) continue

    const samples = value.filter(isHistorySample)
      .filter((sample) => sample.at >= now - HISTORY_RETENTION && sample.at <= now)
      .slice(-HISTORY_LIMIT)
    if (samples.length) result[id] = samples
  }

  return result
}

function isHistorySample(value: unknown): value is HistorySample {
  if (!value || typeof value !== 'object') return false
  const sample = value as Partial<HistorySample>
  return Number.isFinite(sample.at)
    && (sample.health === 'ok' || sample.health === 'warn' || sample.health === 'bad')
    && Array.isArray(sample.stats)
    && sample.stats.every((stat) =>
      !!stat
      && typeof stat.label === 'string'
      && Number.isInteger(stat.index)
      && Number.isFinite(stat.value)
      && typeof stat.unit === 'string',
    )
}
