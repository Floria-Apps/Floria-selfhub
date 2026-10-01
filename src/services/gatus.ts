import { getJson, HttpError } from '../lib/http'
import { fmtNumber } from '../lib/format'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

export const gatus = (c: ServiceConfig): ServiceAdapter => ({
  async snapshot() {
    let data: any[]
    try {
      data = await getJson(c, '/api/v1/endpoints/statuses')
    } catch (e) {
      // Versões antigas do Gatus usam outro caminho
      if (e instanceof HttpError && e.status === 404) data = await getJson(c, '/api/v1/statuses')
      else throw e
    }

    const items: DetailItem[] = data.map((ep) => {
      const last = ep.results?.[ep.results.length - 1]
      return {
        id: ep.key ?? ep.name,
        title: ep.name,
        subtitle: ep.group || undefined,
        trailing: last ? `${Math.round(last.duration / 1e6)} ms` : undefined,
        status: last ? (last.success ? 'up' : 'down') : 'idle',
      }
    })
    const rank = { down: 0, warn: 1, idle: 2, up: 3 } as const
    items.sort((a, b) => rank[a.status ?? 'idle'] - rank[b.status ?? 'idle'])

    const healthy = items.filter((i) => i.status === 'up').length
    const failing = items.filter((i) => i.status === 'down').length
    const durations = data
      .map((ep) => ep.results?.[ep.results.length - 1]?.duration)
      .filter((d): d is number => typeof d === 'number')
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 1e6 : null

    return {
      health: failing > 0 ? 'warn' : 'ok',
      stats: [
        { label: 'Endpoints', value: fmtNumber(items.length), icon: 'vital_signs', tone: 'primary' },
        { label: 'Saudáveis', value: fmtNumber(healthy), icon: 'check_circle', tone: 'secondary' },
        { label: 'Com falha', value: fmtNumber(failing), icon: 'error', tone: failing > 0 ? 'tertiary' : 'neutral' },
        { label: 'Resposta média', value: avg == null ? '-' : `${Math.round(avg)} ms`, icon: 'timer', tone: 'neutral' },
      ],
      itemsTitle: 'Endpoints',
      emptyText: 'Nenhum endpoint configurado no Gatus.',
      items,
    }
  },
})
