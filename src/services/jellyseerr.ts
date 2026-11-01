import { getJson } from '../lib/http'
import { fmtDateTime, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

interface JellyseerrRequest {
  id: number
  status: number
  createdAt?: string
  media?: {
    mediaType?: string
    title?: string
    name?: string
    originalTitle?: string
  }
  requestedBy?: {
    displayName?: string
    username?: string
  }
}

interface JellyseerrResponse {
  version?: string
}

interface JellyseerrRequestsResponse {
  results?: JellyseerrRequest[]
}

const requestStatus = (status: number) => {
  if (status === 1) return 'pending'
  if (status === 2) return 'approved'
  if (status === 3) return 'declined'
  if (status === 4) return 'available'
  if (status === 5) return 'partiallyAvailable'
  return 'unknown'
}

const itemStatus = (status: number): DetailItem['status'] => {
  if (status === 1) return 'warn'
  if (status === 2 || status === 4 || status === 5) return 'up'
  if (status === 3) return 'down'
  return 'idle'
}

export function jellyseerr(c: ServiceConfig): ServiceAdapter {
  if (!c.token) throw new Error(t('jellyseerr.apiKeyRequired'))

  const headers = { Accept: 'application/json', 'X-Api-Key': c.token }

  return {
    async snapshot() {
      const [status, response] = await Promise.all([
        getJson<JellyseerrResponse>(c, '/api/v1/status', { headers }),
        getJson<JellyseerrRequestsResponse | JellyseerrRequest[]>(
          c,
          '/api/v1/request?take=50&skip=0&filter=all&sort=added',
          { headers },
        ),
      ])
      const requests = Array.isArray(response) ? response : response.results ?? []
      const pending = requests.filter((request) => request.status === 1).length

      return {
        health: 'ok',
        stats: [
          {
            label: t('jellyseerr.requests'),
            value: fmtNumber(requests.length),
            icon: 'movie_filter',
            tone: 'primary',
          },
          {
            label: t('jellyseerr.pending'),
            value: fmtNumber(pending),
            icon: 'hourglass_top',
            tone: pending ? 'tertiary' : 'neutral',
          },
          {
            label: t('common.version'),
            value: status.version ?? '-',
            icon: 'info',
            tone: 'neutral',
          },
        ],
        itemsTitle: t('jellyseerr.recent'),
        emptyText: t('jellyseerr.empty'),
        items: requests.slice(0, 10).map((request) => {
          const media = request.media
          const title = media?.title ?? media?.name ?? media?.originalTitle ?? t('jellyseerr.unknownMedia')
          const user = request.requestedBy?.displayName ?? request.requestedBy?.username
          const subtitle = [
            media?.mediaType ? t(`jellyseerr.type.${media.mediaType}`) : undefined,
            t(`jellyseerr.status.${requestStatus(request.status)}`),
            user,
          ].filter(Boolean).join(' · ')

          return {
            id: String(request.id),
            title,
            subtitle,
            trailing: request.createdAt ? fmtDateTime(request.createdAt) : undefined,
            status: itemStatus(request.status),
          }
        }),
      }
    },
  }
}
