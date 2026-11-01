import { fmtDecimal, fmtNumber } from '../lib/format'
import { isTauri, request, getJson } from '../lib/http'
import { t } from '../lib/i18n'
import type { DetailItem, Health, ServiceAdapter, ServiceConfig } from './types'

interface QBitTransferInfo {
  connection_status?: string
  dl_info_speed?: number
  up_info_speed?: number
  dht_nodes?: number
}

interface QBitTorrent {
  hash: string
  name: string
  state: string
  progress: number
  dlspeed: number
  upspeed: number
  size: number
  eta: number
}

function stateStatus(state: string): DetailItem['status'] {
  if (state === 'error' || state === 'missingFiles') return 'down'
  if (state.startsWith('paused')) return 'idle'
  if (state.startsWith('stalled')) return 'warn'
  return 'up'
}

function isActive(state: string) {
  return [
    'downloading',
    'uploading',
    'forcedDL',
    'forcedUP',
    'metaDL',
    'checkingDL',
    'checkingUP',
    'moving',
  ].includes(state)
}

export function qbittorrent(c: ServiceConfig): ServiceAdapter {
  const { username, password } = c
  if (!username || !password) throw new Error(t('qbit.credentialsRequired'))

  return {
    async snapshot() {
      const body = new URLSearchParams()
      body.set('username', username)
      body.set('password', password)

      const login = await request(c, '/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'include',
      })
      const loginResult = (await login.text()).trim()
      if (loginResult !== 'Ok.') throw new Error(t('qbit.loginFailed'))

      const cookie = isTauri()
        ? login.headers.get('set-cookie')?.split(';', 1)[0]
        : undefined
      const headers = cookie ? { Cookie: cookie } : undefined
      const requestOptions = { headers, credentials: 'include' as const }

      const [transfer, torrents] = await Promise.all([
        getJson<QBitTransferInfo>(c, '/api/v2/transfer/info', requestOptions),
        getJson<QBitTorrent[]>(c, '/api/v2/torrents/info?sort=added_on&reverse=true', requestOptions),
      ])

      const downloads = Array.isArray(torrents) ? torrents : []
      const connection = transfer.connection_status ?? 'unknown'
      const health: Health = connection === 'connected' ? 'ok' : 'warn'

      return {
        health,
        stats: [
          {
            label: t('qbit.torrents'),
            value: fmtNumber(downloads.length),
            icon: 'download',
            tone: 'primary',
          },
          {
            label: t('qbit.active'),
            value: fmtNumber(downloads.filter((torrent) => isActive(torrent.state)).length),
            icon: 'sync',
            tone: 'secondary',
          },
          {
            label: t('qbit.downloadSpeed'),
            value: `${fmtDecimal((transfer.dl_info_speed ?? 0) / 1_000_000, 2)} MB/s`,
            icon: 'south',
            tone: 'tertiary',
          },
          {
            label: t('qbit.uploadSpeed'),
            value: `${fmtDecimal((transfer.up_info_speed ?? 0) / 1_000_000, 2)} MB/s`,
            icon: 'north',
            tone: 'neutral',
          },
        ],
        itemsTitle: t('qbit.torrents'),
        emptyText: t('qbit.empty'),
        items: [...downloads]
          .sort((a, b) => b.dlspeed - a.dlspeed)
          .slice(0, 10)
          .map((torrent) => ({
            id: torrent.hash,
            title: torrent.name,
            subtitle: t('qbit.stateLabel', { state: torrent.state }),
            trailing: `${fmtDecimal(torrent.progress * 100, 1)}%`,
            progress: Math.max(0, Math.min(1, torrent.progress)),
            status: stateStatus(torrent.state),
          })),
      }
    },
  }
}
