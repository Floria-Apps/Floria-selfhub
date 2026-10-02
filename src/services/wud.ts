import { basicAuth, getJson, request } from '../lib/http'
import { fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

// What's up Docker (getwud/wud). A partir da v9 a autenticação é obrigatória (Basic).
// Em versões antigas, sem login configurado, deixe usuário e senha vazios.

export const wud = (c: ServiceConfig): ServiceAdapter => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (c.username) headers.Authorization = basicAuth(c.username, c.password ?? '')

  return {
    async snapshot() {
      const [raw, app] = await Promise.all([
        getJson(c, '/api/containers', { headers }),
        getJson(c, '/api/app', { headers }).catch(() => null),
      ])
      const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? raw?.containers ?? [])

      const items: DetailItem[] = list.map((ct, idx) => {
        const update = ct?.updateAvailable === true
        const kind = ct?.updateKind ?? {}
        const tag = ct?.image?.tag?.value
        const imageName = ct?.image?.name ? `${ct.image.name}${tag ? `:${tag}` : ''}` : undefined

        let detail: string | undefined
        let trailing: string | undefined
        if (update) {
          if (kind.kind === 'digest') {
            detail = t('upd.digest')
            trailing = t('upd.digestShort')
          } else {
            const from = kind.localValue
            const to = kind.remoteValue ?? ct?.result?.tag
            detail = from && to ? t('upd.fromTo', { from, to }) : to ? t('upd.newVersion', { to }) : t('upd.availableOne')
            const diff = kind.semverDiff
            if (diff === 'major' || diff === 'minor' || diff === 'patch') trailing = t(`upd.${diff}`)
          }
        }

        return {
          id: String(ct?.id ?? idx),
          title: String(ct?.displayName ?? ct?.name ?? '?'),
          subtitle: detail ?? imageName,
          trailing,
          status: update ? 'warn' : 'up',
        }
      })
      items.sort((a, b) => (a.status === 'warn' ? 0 : 1) - (b.status === 'warn' ? 0 : 1))

      const updates = items.filter((i) => i.status === 'warn').length

      return {
        health: 'ok',
        stats: [
          { label: t('wud.containers'), value: fmtNumber(items.length), icon: 'inventory_2', tone: 'primary' },
          { label: t('upd.available'), value: fmtNumber(updates), icon: 'system_update_alt', tone: updates > 0 ? 'tertiary' : 'neutral' },
          { label: t('upd.upToDate'), value: fmtNumber(items.length - updates), icon: 'check_circle', tone: 'secondary' },
          { label: t('common.version'), value: String(app?.version ?? '-'), icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: t('wud.containers'),
        emptyText: t('wud.empty'),
        items,
      }
    },
    actions: [
      {
        id: 'watch',
        label: t('upd.checkNow'),
        icon: 'refresh',
        run: async () => {
          await request(c, '/api/containers/watch', { method: 'POST', headers, timeoutMs: 120_000 })
          return t('upd.checkDone')
        },
      },
    ],
  }
}
