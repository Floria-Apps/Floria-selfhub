export const fmtNumber = (n: number | undefined | null) =>
  n == null ? '-' : new Intl.NumberFormat('pt-BR').format(n)

export const fmtDecimal = (n: number, digits = 1) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(n)

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function fmtAgo(from: number | string | Date, now = Date.now()) {
  const t = new Date(from).getTime()
  if (Number.isNaN(t)) return '-'
  const diff = Math.max(0, Math.round((now - t) / 1000))
  if (diff < 10) return 'agora'
  if (diff < 60) return `há ${diff} s`
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}
