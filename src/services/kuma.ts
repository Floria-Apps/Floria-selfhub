import { getJson } from '../lib/http'
import { fmtDecimal } from '../lib/format'
import type { DetailItem, ItemStatus, ServiceAdapter, ServiceConfig } from './types'

// O Uptime Kuma não tem API REST oficial. Usamos a página de status pública,
// que expõe JSON sem autenticação.
const STATUS: Record<number, ItemStatus> = { 0: 'down', 1: 'up', 2: 'warn', 3: 'idle' }

export const kuma = (c: ServiceConfig): ServiceAdapter => ({
  async snapshot() {
    if (!c.slug)
      throw new Error('Informe o identificador da página de status (slug) nas configurações do serviço.')

    const [page, beats] = await Promise.all([
      getJson(c, `/api/status-page/${encodeURIComponent(c.slug)}`),
      getJson(c, `/api/status-page/heartbeat/${encodeURIComponent(c.slug)}`),
    ])

    const items: DetailItem[] = []
    for (const group of page.publicGroupList ?? []) {
      for (const m of group.monitorList ?? []) {
        const list: any[] = beats.heartbeatList?.[m.id] ?? []
        const last = list[list.length - 1]
        const uptime = beats.uptimeList?.[`${m.id}_24`]
        items.push({
          id: String(m.id),
          title: m.name,
          subtitle: group.name,
          trailing: uptime != null ? `${fmtDecimal(uptime * 100)}%` : last?.ping != null ? `${last.ping} ms` : undefined,
          status: last ? (STATUS[last.status] ?? 'idle') : 'idle',
        })
      }
    }
    const rank = { down: 0, warn: 1, idle: 2, up: 3 } as const
    items.sort((a, b) => rank[a.status ?? 'idle'] - rank[b.status ?? 'idle'])

    const up = items.filter((i) => i.status === 'up').length
    const down = items.filter((i) => i.status === 'down').length
    const uptimes = Object.values<number>(beats.uptimeList ?? {})
    const avg = uptimes.length ? (uptimes.reduce((a, b) => a + b, 0) / uptimes.length) * 100 : null

    return {
      health: down > 0 ? 'warn' : 'ok',
      stats: [
        { label: 'Monitores', value: String(items.length), icon: 'monitor_heart', tone: 'primary' },
        { label: 'No ar', value: String(up), icon: 'check_circle', tone: 'secondary' },
        { label: 'Fora do ar', value: String(down), icon: 'error', tone: down > 0 ? 'tertiary' : 'neutral' },
        { label: 'Disponibilidade 24 h', value: avg == null ? '-' : `${fmtDecimal(avg)}%`, icon: 'schedule', tone: 'neutral' },
      ],
      itemsTitle: 'Monitores',
      emptyText: 'Essa página de status não tem monitores.',
      items,
    }
  },
})
