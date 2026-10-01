import { getJson, request } from '../lib/http'
import { fmtAgo, fmtDecimal } from '../lib/format'
import type { ServiceAdapter, ServiceConfig } from './types'

const mbps = (r: any, key: 'download' | 'upload') => {
  const bits = r[`${key}_bits`] ?? (r[key] != null ? r[key] * 8 : null)
  return bits == null ? null : bits / 1e6
}
const show = (n: number | null) => (n == null ? '-' : fmtDecimal(n, 1))

export const speedtest = (c: ServiceConfig): ServiceAdapter => {
  const headers = { Authorization: `Bearer ${c.token ?? ''}`, Accept: 'application/json' }

  return {
    async snapshot() {
      const [latest, list] = await Promise.all([
        getJson(c, '/api/v1/results/latest', { headers }),
        getJson(c, '/api/v1/results?per_page=10', { headers }),
      ])
      const r = latest.data ?? latest
      const rows: any[] = [...(list.data ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      return {
        health: 'ok',
        stats: [
          { label: 'Download (Mbps)', value: show(mbps(r, 'download')), icon: 'download', tone: 'primary' },
          { label: 'Upload (Mbps)', value: show(mbps(r, 'upload')), icon: 'upload', tone: 'secondary' },
          { label: 'Ping (ms)', value: r.ping != null ? fmtDecimal(Number(r.ping), 1) : '-', icon: 'network_ping', tone: 'tertiary' },
          { label: 'Último teste', value: r.created_at ? fmtAgo(r.created_at) : '-', icon: 'schedule', tone: 'neutral' },
        ],
        itemsTitle: 'Últimos testes',
        emptyText: 'Nenhum teste registrado ainda.',
        items: rows.map((x) => ({
          id: String(x.id),
          title: `Download ${show(mbps(x, 'download'))} / Upload ${show(mbps(x, 'upload'))} Mbps`,
          subtitle: new Date(x.created_at).toLocaleString('pt-BR'),
          trailing: x.ping != null ? `${fmtDecimal(Number(x.ping), 0)} ms` : undefined,
          status: x.status === 'failed' ? 'down' : 'up',
        })),
      }
    },
    actions: [
      {
        id: 'run',
        label: 'Rodar teste agora',
        icon: 'play_arrow',
        run: async () => {
          await request(c, '/api/v1/speedtests/run', { method: 'POST', headers })
          return 'Teste iniciado. Os resultados aparecem em alguns minutos.'
        },
      },
    ],
  }
}
