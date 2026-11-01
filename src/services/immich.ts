import { fmtNumber } from '../lib/format'
import { getJson } from '../lib/http'
import { t } from '../lib/i18n'
import type { ServiceAdapter, ServiceConfig } from './types'

interface ImmichAbout {
  version?: string
  versionUrl?: string
}

interface ImmichStatistics {
  photos?: number
  videos?: number
  usageByUser?: { userId: string; userName?: string }[]
}

export function immich(c: ServiceConfig): ServiceAdapter {
  if (!c.token) throw new Error(t('immich.apiKeyRequired'))
  const headers = { Accept: 'application/json', 'x-api-key': c.token }

  return {
    async snapshot() {
      const [about, statistics] = await Promise.all([
        getJson<ImmichAbout>(c, '/api/server/about', { headers }),
        getJson<ImmichStatistics>(c, '/api/server/statistics', { headers }),
      ])

      return {
        health: 'ok',
        stats: [
          {
            label: t('common.version'),
            value: about.version ?? '-',
            icon: 'info',
            tone: 'primary',
          },
          {
            label: t('immich.photos'),
            value: fmtNumber(statistics.photos),
            icon: 'photo_library',
            tone: 'secondary',
          },
          {
            label: t('immich.videos'),
            value: fmtNumber(statistics.videos),
            icon: 'movie',
            tone: 'tertiary',
          },
          {
            label: t('immich.users'),
            value: fmtNumber(statistics.usageByUser?.length),
            icon: 'group',
            tone: 'neutral',
          },
        ],
        itemsTitle: t('immich.library'),
        emptyText: t('immich.noUsers'),
        items: (statistics.usageByUser ?? []).map((user) => ({
          id: user.userId,
          title: user.userName ?? user.userId,
          subtitle: t('immich.userLibrary'),
          status: 'idle',
        })),
      }
    },
  }
}
