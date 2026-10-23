import { md5 } from 'js-md5'
import { getJson } from '../lib/http'
import { fmtAgo, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

const toArray = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v])

export const navidrome = (c: ServiceConfig): ServiceAdapter => {
  const auth = () => {
    const salt = Math.random().toString(36).slice(2, 10)
    const token = md5((c.password ?? '') + salt)
    return `u=${encodeURIComponent(c.username ?? '')}&t=${token}&s=${salt}&v=1.16.1&c=selfhub&f=json`
  }

  const call = async (endpoint: string, params = '') => {
    const json = await getJson(c, `/rest/${endpoint}.view?${auth()}${params ? `&${params}` : ''}`)
    const res = json['subsonic-response']
    if (!res || res.status !== 'ok') {
      throw new Error(
        res?.error?.code === 40
          ? t('nd.badLogin')
          : t('nd.refused', { msg: res?.error?.message ?? t('nd.invalid') }),
      )
    }
    return res
  }

  const coverUrl = (coverArt?: string) => {
    if (!coverArt) return undefined

    return `${c.baseUrl.replace(/\/+$/, '')}/rest/getCoverArt.view?id=${encodeURIComponent(coverArt)}&${auth()}&size=160`
  }

  // Álbuns tocados por último. Só roda quando ninguém está ouvindo nada.
  // Se falhar, devolve lista vazia: isso não pode derrubar o resto do snapshot.
  const recentAlbums = async (): Promise<DetailItem[]> => {
    try {
      const res = await call('getAlbumList2', 'type=recent&size=10')
      return toArray(res.albumList2?.album).map((a, i) => ({
        id: `album-${a.id ?? i}`,
        title: String(a.name ?? a.title ?? '?'),
        subtitle: [a.artist, a.year].filter(Boolean).join(' · ') || undefined,
        status: 'idle',
        imageUrl: coverUrl(a.coverArt ?? a.id),
      }))
    } catch {
      return []
    }
  }

  return {
    async snapshot() {
      const [ping, now, scan] = await Promise.all([
        call('ping'),
        call('getNowPlaying'),
        call('getScanStatus'),
      ])

      const entries = toArray(now.nowPlaying?.entry)
      const scanning = !!scan.scanStatus?.scanning

      // "lastScan" é um campo extra do Navidrome. Ignora valores inválidos
      // e a data zero ("0001-01-01...") que aparece quando nunca houve varredura.
      const lastScanTs = Date.parse(scan.scanStatus?.lastScan ?? '')
      const lastScan = Number.isFinite(lastScanTs) && lastScanTs > Date.UTC(2000, 0, 1) ? fmtAgo(lastScanTs) : undefined

      let itemsTitle = t('nd.playing')
      let items: DetailItem[]

      if (entries.length) {
        items = entries.map((e, i) => ({
          id: `${e.id ?? i}-${e.username}`,
          title: e.title,
          subtitle: `${e.artist} - ${e.album}`,
          trailing: e.username,
          status: 'up',
          imageUrl: coverUrl(e.coverArt),
          favorite: Boolean(e.starred),
          // Sem nota = undefined (com 0 o painel mostraria "0/5" em toda faixa)
          rating: e.userRating ? Math.max(1, Math.min(5, Number(e.userRating) || 1)) : undefined,
        }))
      } else {
        items = await recentAlbums()
        if (items.length) itemsTitle = t('nd.recent')
      }

      return {
        health: 'ok',
        stats: [
          { label: t('nd.playing'), value: String(entries.length), icon: 'headphones', tone: 'primary' },
          { label: t('nd.tracks'), value: fmtNumber(scan.scanStatus?.count), icon: 'library_music', tone: 'secondary' },
          {
            label: t('nd.scan'), value: scanning ? t('nd.scanning') : t('nd.idle'), icon: 'radar', tone: 'tertiary',
            hint: lastScan ? t('nd.lastScan', { ago: lastScan }) : undefined,
          },
          { label: t('common.version'), value: String(ping.serverVersion ?? ping.version ?? '-'), icon: 'info', tone: 'neutral' },
        ],
        itemsTitle,
        emptyText: t('nd.empty'),
        items,
      }
    },
    actions: [
      {
        id: 'scan',
        label: t('nd.startScan'),
        icon: 'radar',
        run: async () => {
          await call('startScan')
          return t('nd.scanStarted')
        },
      },
    ],
  }
}