import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../i18n'
import {
  buildAvailabilitySeries,
  makeHistorySample,
  normalizeHistory,
  parseStatValue,
} from '../history'

describe('service history', () => {
  const originalLocale = locale.value

  afterEach(() => {
    locale.value = originalLocale
  })

  it('parses metrics using the active locale', () => {
    locale.value = 'pt-BR'
    expect(parseStatValue('1.234,5 ms')).toEqual({ value: 1234.5, unit: 'ms' })

    locale.value = 'en'
    expect(parseStatValue('1,234.5 Mbps')).toEqual({ value: 1234.5, unit: 'Mbps' })
  })

  it('ignores textual values and versions', () => {
    expect(parseStatValue('há 5 min')).toBeNull()
    expect(parseStatValue('1.2.3')).toBeNull()
  })

  it('keeps bounded, recent history only for configured services', () => {
    const now = 1_000_000
    const normalized = normalizeHistory(
      {
        known: [
          { at: now - 100, health: 'ok', stats: [] },
          { at: now - 8 * 24 * 60 * 60 * 1000, health: 'bad', stats: [] },
          { at: now + 1, health: 'warn', stats: [] },
          { at: now, health: 'unknown', stats: [] },
        ],
        removed: [{ at: now, health: 'ok', stats: [] }],
      },
      ['known'],
      now,
    )

    expect(normalized).toEqual({
      known: [{ at: now - 100, health: 'ok', stats: [] }],
    })
  })

  it('records failed checks as bad without stale metrics', () => {
    expect(makeHistorySample(undefined, 123, true)).toEqual({
      at: 123,
      health: 'bad',
      stats: [],
    })
  })

  it('builds hourly service percentages from each service latest sample and ignores paused services', () => {
    const hour = 60 * 60 * 1000
    const now = 100 * hour + 30 * 60 * 1000
    const activeTime = now - 10 * 60 * 1000
    const histories: Record<string, { at: number; health: 'ok' | 'warn' | 'bad'; stats: [] }[]> = {
      first: [
        { at: activeTime, health: 'ok', stats: [] },
        { at: activeTime + 1, health: 'warn', stats: [] },
      ],
      second: [{ at: activeTime, health: 'bad', stats: [] }],
      paused: [{ at: activeTime, health: 'ok', stats: [] }],
    }

    const series = buildAvailabilitySeries(
      [
        { id: 'first' },
        { id: 'second' },
        { id: 'paused', monitoringPaused: true },
      ],
      (id) => histories[id] ?? [],
      now,
    )

    expect(series).toHaveLength(24)
    expect(series[23]).toEqual({
      at: Math.floor(now / hour) * hour,
      ok: 0,
      warn: 1,
      bad: 1,
    })
  })
})
