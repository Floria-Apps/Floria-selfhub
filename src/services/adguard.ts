import { basicAuth, getJson, request } from '../lib/http'
import { fmtDecimal, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { ServiceAdapter, ServiceConfig } from './types'

// AdGuard Home: API /control/*, com Basic Auth quando o login está ativo.

export const adguard = (c: ServiceConfig): ServiceAdapter => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (c.username) headers.Authorization = basicAuth(c.username, c.password ?? '')

  const setProtection = (enabled: boolean, durationMs?: number) =>
    request(c, '/control/protection', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(durationMs ? { enabled, duration: durationMs } : { enabled }),
    })

  return {
    async snapshot() {
      const [status, stats] = await Promise.all([
        getJson(c, '/control/status', { headers }),
        getJson(c, '/control/stats', { headers }),
      ])

      const queries = Number(stats.num_dns_queries ?? 0)
      const blocked = Number(stats.num_blocked_filtering ?? 0)
      const rate = queries > 0 ? (blocked / queries) * 100 : 0
      // avg_processing_time vem em segundos
      const avgMs = Number(stats.avg_processing_time ?? 0) * 1000
      const on = status.protection_enabled !== false

      // top_blocked_domains é uma lista de objetos de uma chave só: [{ "dominio.com": 12 }]
      const top: [string, number][] = (Array.isArray(stats.top_blocked_domains) ? stats.top_blocked_domains : [])
        .map((o: Record<string, number>) => Object.entries(o ?? {})[0])
        .filter(Boolean)

      return {
        health: on ? 'ok' : 'warn',
        stats: [
          { label: t('ag.queries'), value: fmtNumber(queries), icon: 'dns', tone: 'primary' },
          { label: t('ag.blocked'), value: fmtNumber(blocked), icon: 'block', tone: 'tertiary' },
          { label: t('ag.rate'), value: `${fmtDecimal(rate, 1)}%`, icon: 'percent', tone: 'secondary' },
          { label: t('ag.avg'), value: `${fmtDecimal(avgMs, 1)} ms`, icon: 'timer', tone: 'neutral' },
          { label: t('ag.protection'), value: on ? t('ag.on') : t('ag.off'), icon: on ? 'shield' : 'gpp_maybe', tone: on ? 'neutral' : 'tertiary' },
          { label: t('common.version'), value: String(status.version ?? '-'), icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: t('ag.topBlocked'),
        emptyText: t('ag.empty'),
        items: top.map(([domain, count]) => ({ id: domain, title: domain, trailing: fmtNumber(count) })),
      }
    },
    actions: [
      {
        id: 'pause',
        label: t('ag.pause'),
        icon: 'pause_circle',
        run: async () => {
          await setProtection(false, 5 * 60 * 1000)
          return t('ag.paused')
        },
      },
      {
        id: 'resume',
        label: t('ag.resume'),
        icon: 'shield',
        run: async () => {
          await setProtection(true)
          return t('ag.resumed')
        },
      },
    ],
  }
}
