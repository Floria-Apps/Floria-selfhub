import { getJson, HttpError, request } from '../lib/http'
import { fmtAgo, fmtDateTime, fmtDecimal } from '../lib/format'
import { t } from '../lib/i18n'
import type { ServiceAdapter, ServiceConfig } from './types'

interface SpeedtestResult {
  id?: string | number
  download?: number | null
  upload?: number | null
  download_bits?: number | null
  upload_bits?: number | null
  ping?: number | null
  status?: string | null
  healthy?: boolean | null
  created_at?: string | null
  data?: {
    isp?: string
    packetLoss?: number | null
    ping?: { jitter?: number | null }
    server?: { name?: string; location?: string }
  }
}

interface ResultsResponse {
  data?: SpeedtestResult[]
}

interface LatestResponse {
  data?: SpeedtestResult | null
}

const isSpeedtestResult = (value: unknown): value is SpeedtestResult =>
  typeof value === 'object' &&
  value !== null &&
  ('id' in value || 'created_at' in value)

const mbps = (r: SpeedtestResult, key: 'download' | 'upload') => {
  const bits = r[`${key}_bits`] ?? (r[key] != null ? r[key] * 8 : null)
  return bits == null ? null : bits / 1e6
}
const show = (n: number | null) => (n == null ? '-' : fmtDecimal(n, 1))

export const speedtest = (c: ServiceConfig): ServiceAdapter => {
  const headers = { Authorization: `Bearer ${c.token ?? ''}`, Accept: 'application/json' }

  return {
    async snapshot() {
      const getLatest = async () => {
        try {
          const response = await getJson<LatestResponse | SpeedtestResult>(
            c,
            '/api/v1/results/latest',
            { headers },
          )
          if (isSpeedtestResult(response)) return response
          return isSpeedtestResult(response.data) ? response.data : null
        } catch (error) {
          if (error instanceof HttpError && error.status === 404) return null
          throw error
        }
      }
      const [latest, list] = await Promise.all([
        getLatest(),
        getJson<ResultsResponse>(c, '/api/v1/results?per_page=10', { headers }),
      ])
      const rows = [...(list.data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      )
      const current = latest ?? rows[0] ?? null
      const details = current?.data
      const networkHint = [
        details?.ping?.jitter != null
          ? t('st.jitter', { value: fmtDecimal(details.ping.jitter, 1) })
          : undefined,
        details?.packetLoss != null
          ? t('st.packetLoss', { value: fmtDecimal(details.packetLoss, 1) })
          : undefined,
      ].filter(Boolean).join(' · ')

      return {
        health: 'ok',
        stats: [
          { label: t('st.download'), value: current ? show(mbps(current, 'download')) : '-', icon: 'download', tone: 'primary' },
          { label: t('st.upload'), value: current ? show(mbps(current, 'upload')) : '-', icon: 'upload', tone: 'secondary' },
          { label: t('st.ping'), value: current?.ping != null ? fmtDecimal(current.ping, 1) : '-', hint: networkHint || undefined, icon: 'network_ping', tone: 'tertiary' },
          { label: t('st.last'), value: current?.created_at ? fmtAgo(current.created_at) : '-', icon: 'schedule', tone: 'neutral' },
        ],
        itemsTitle: t('st.recent'),
        emptyText: t('st.empty'),
        items: rows.map((result, index) => {
          const server = [
            result.data?.server?.name,
            result.data?.server?.location,
          ].filter(Boolean).join(', ')
          const metadata = [
            result.data?.isp
              ? t('st.isp', { name: result.data.isp })
              : undefined,
            server ? t('st.server', { name: server }) : undefined,
          ].filter(Boolean)
          const status = result.status?.toLowerCase()
          const failed = result.healthy === false || status === 'failed'
          const successful = result.healthy === true || status === 'completed'

          return {
            id: String(result.id ?? result.created_at ?? index),
            title: t('st.itemTitle', {
              down: show(mbps(result, 'download')),
              up: show(mbps(result, 'upload')),
            }),
            subtitle: [
              result.created_at ? fmtDateTime(result.created_at) : undefined,
              ...metadata,
            ].filter(Boolean).join(' · '),
            trailing: result.ping != null
              ? `${fmtDecimal(result.ping, 0)} ms`
              : undefined,
            status: failed ? 'down' : successful ? 'up' : 'idle',
          }
        }),
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
