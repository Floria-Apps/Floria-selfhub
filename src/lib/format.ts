import { locale, t } from './i18n'

export const fmtNumber = (n: number | undefined | null) =>
  n == null ? '-' : new Intl.NumberFormat(locale.value).format(n)

export const fmtDecimal = (n: number, digits = 1) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: digits }).format(n)

export const fmtDateTime = (d: string | number | Date) => new Date(d).toLocaleString(locale.value)

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function fmtAgo(from: number | string | Date, now = Date.now()) {
  const time = new Date(from).getTime()
  if (Number.isNaN(time)) return '-'
  const diff = Math.max(0, Math.round((now - time) / 1000))
  if (diff < 10) return t('ago.now')
  if (diff < 60) return t('ago.s', { n: diff })
  if (diff < 3600) return t('ago.m', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('ago.h', { n: Math.floor(diff / 3600) })
  return t('ago.d', { n: Math.floor(diff / 86400) })
}
