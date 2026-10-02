import { getJson, request } from '../lib/http'
import { fmtAgo, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

// Cup (sergi0g/cup): API v3, sem autenticação.
// O formato exato do JSON varia entre versões, então tudo é lido de forma defensiva
// e os totais são recalculados a partir da lista de imagens quando faltam em "metrics".

const name = (u: unknown): string => (typeof u === 'string' ? u : ((u as any)?.name ?? ''))

export const cup = (c: ServiceConfig): ServiceAdapter => ({
  async snapshot() {
    const data = await getJson(c, '/api/v3/json')
    const images: any[] = Array.isArray(data?.images) ? data.images : []
    const m = data?.metrics ?? {}

    const hasUpdate = (i: any) => i?.result?.has_update === true
    const isUnknown = (i: any) => i?.result?.has_update == null

    const monitored = m.monitored_images ?? images.length
    const updates = m.updates_available ?? m.update_available ?? images.filter(hasUpdate).length
    const upToDate = m.up_to_date ?? images.filter((i) => !hasUpdate(i) && !isUnknown(i)).length
    const unknown = m.unknown ?? images.filter(isUnknown).length

    const items: DetailItem[] = images.map((img, idx) => {
      const info = img?.result?.info ?? {}
      const users = (Array.isArray(img?.used_by) ? img.used_by : []).map(name).filter(Boolean).join(', ')

      let detail: string | undefined
      let trailing: string | undefined
      if (hasUpdate(img)) {
        if (info.type === 'digest') {
          detail = t('upd.digest')
          trailing = t('upd.digestShort')
        } else {
          const from = info.current_version ?? info.current_tag
          const to = info.new_version ?? info.new_tag
          detail = from && to ? t('upd.fromTo', { from, to }) : to ? t('upd.newVersion', { to }) : t('upd.availableOne')
          const kind = info.version_update_type
          if (kind === 'major' || kind === 'minor' || kind === 'patch') trailing = t(`upd.${kind}`)
        }
      }

      return {
        id: String(img?.reference ?? idx),
        title: String(img?.reference ?? img?.name ?? '?'),
        subtitle: detail ?? (isUnknown(img) ? t('upd.cantCheck') : users || undefined),
        trailing,
        status: hasUpdate(img) ? 'warn' : isUnknown(img) ? 'idle' : 'up',
      }
    })
    const rank = { warn: 0, idle: 1, down: 1, up: 2 } as const
    items.sort((a, b) => rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank])

    const checked = data?.last_updated ? fmtAgo(data.last_updated) : '-'

    return {
      health: 'ok',
      stats: [
        {
          label: t('upd.monitoredImages'), value: fmtNumber(monitored), icon: 'local_cafe', tone: 'primary',
          hint: checked !== '-' ? t('upd.checked', { ago: checked }) : undefined,
        },
        { label: t('upd.available'), value: fmtNumber(updates), icon: 'system_update_alt', tone: updates > 0 ? 'tertiary' : 'neutral' },
        { label: t('upd.upToDate'), value: fmtNumber(upToDate), icon: 'check_circle', tone: 'secondary' },
        { label: t('upd.unknown'), value: fmtNumber(unknown), icon: 'help', tone: 'neutral' },
      ],
      itemsTitle: t('upd.images'),
      emptyText: t('cup.empty'),
      items,
    }
  },
  actions: [
    {
      id: 'refresh',
      label: t('upd.checkNow'),
      icon: 'refresh',
      run: async () => {
        // A verificação consulta os registries e pode demorar
        await request(c, '/api/v3/refresh', { timeoutMs: 120_000 })
        return t('upd.checkDone')
      },
    },
  ],
})
