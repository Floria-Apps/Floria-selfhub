import { getJson, request } from '../lib/http'
import { fmtAgo, fmtDateTime, fmtDecimal } from '../lib/format'
import { t } from '../lib/i18n'
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
          { label: t('st.download'), value: show(mbps(r, 'download')), icon: 'download', tone: 'primary' },
          { label: t('st.upload'), value: show(mbps(r, 'upload')), icon: 'upload', tone: 'secondary' },
          { label: t('st.ping'), value: r.ping != null ? fmtDecimal(Number(r.ping), 1) : '-', icon: 'network_ping', tone: 'tertiary' },
          { label: t('st.last'), value: r.created_at ? fmtAgo(r.created_at) : '-', icon: 'schedule', tone: 'neutral' },
        ],
        itemsTitle: t('st.recent'),
        emptyText: t('st.empty'),
        items: rows.map((x) => ({
          id: String(x.id),
          title: t('st.itemTitle', { down: show(mbps(x, 'download')), up: show(mbps(x, 'upload')) }),
          subtitle: fmtDateTime(x.created_at),
          trailing: x.ping != null ? `${fmtDecimal(Number(x.ping), 0)} ms` : undefined,
          status: x.status === 'failed' ? 'down' : 'up',
        })),
      }
    },
    actions: [
      {
        id: 'run',
        label: t('st.run'),
        icon: 'play_arrow',
        run: async () => {
          await request(c, '/api/v1/speedtests/run', { method: 'POST', headers })
          return t('st.started')
        },
      },
    ],
  }
}
