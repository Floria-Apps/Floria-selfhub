import { md5 } from 'js-md5'
import { getJson } from '../lib/http'
import { fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { ServiceAdapter, ServiceConfig } from './types'

export const navidrome = (c: ServiceConfig): ServiceAdapter => {
  const auth = () => {
    const salt = Math.random().toString(36).slice(2, 10)
    const token = md5((c.password ?? '') + salt)
    return `u=${encodeURIComponent(c.username ?? '')}&t=${token}&s=${salt}&v=1.16.1&c=selfhub&f=json`
  }

  const call = async (endpoint: string) => {
    const json = await getJson(c, `/rest/${endpoint}.view?${auth()}`)
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

  return {
    async snapshot() {
      const [ping, now, scan] = await Promise.all([
        call('ping'),
        call('getNowPlaying'),
        call('getScanStatus'),
      ])
      const entries: any[] = now.nowPlaying?.entry ?? []
      const scanning = !!scan.scanStatus?.scanning

      return {
        health: 'ok',
        stats: [
          { label: t('nd.playing'), value: String(entries.length), icon: 'headphones', tone: 'primary' },
          { label: t('nd.tracks'), value: fmtNumber(scan.scanStatus?.count), icon: 'library_music', tone: 'secondary' },
          { label: t('nd.scan'), value: scanning ? t('nd.scanning') : t('nd.idle'), icon: 'radar', tone: 'tertiary' },
          { label: t('common.version'), value: String(ping.serverVersion ?? ping.version ?? '-'), icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: t('nd.playing'),
        emptyText: t('nd.empty'),
        items: entries.map((e, i) => ({
          id: `${e.id ?? i}-${e.username}`,
          title: e.title,
          subtitle: `${e.artist} - ${e.album}`,
          trailing: e.username,
          status: 'up',
        })),
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
