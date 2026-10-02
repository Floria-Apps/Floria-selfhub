import { getJson, request } from '../lib/http'
import { fmtClock, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { ServiceAdapter, ServiceConfig } from './types'

export const jellyfin = (c: ServiceConfig): ServiceAdapter => {
  const headers = {
    Authorization: `MediaBrowser Token="${c.token ?? ''}"`,
    Accept: 'application/json',
  }
  const get = <T = any>(path: string) => getJson<T>(c, path, { headers })

  return {
    async snapshot() {
      const [info, sessions, counts] = await Promise.all([
        get('/System/Info'),
        get<any[]>('/Sessions'),
        get('/Items/Counts'),
      ])

      const playing = sessions.filter((s) => s.NowPlayingItem)

      return {
        health: 'ok',
        stats: [
          { label: t('jf.sessions'), value: String(playing.length), icon: 'play_circle', tone: 'primary' },
          { label: t('jf.movies'), value: fmtNumber(counts.MovieCount), icon: 'movie', tone: 'secondary' },
          { label: t('jf.series'), value: fmtNumber(counts.SeriesCount), icon: 'tv', tone: 'tertiary' },
          { label: t('jf.episodes'), value: fmtNumber(counts.EpisodeCount), icon: 'video_library', tone: 'neutral' },
          { label: t('jf.songs'), value: fmtNumber(counts.SongCount), icon: 'music_note', tone: 'secondary' },
          { label: t('common.version'), value: String(info.Version ?? '-'), hint: info.ServerName, icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: t('jf.watching'),
        emptyText: t('jf.empty'),
        items: playing.map((s) => {
          const item = s.NowPlayingItem
          const pos = (s.PlayState?.PositionTicks ?? 0) / 1e7
          const total = (item.RunTimeTicks ?? 0) / 1e7
          return {
            id: s.Id,
            title: item.SeriesName ? `${item.SeriesName} - ${item.Name}` : item.Name,
            subtitle: t('jf.on', { user: s.UserName, device: s.DeviceName }),
            trailing: s.PlayState?.IsPaused ? t('common.paused') : fmtClock(pos),
            status: s.PlayState?.IsPaused ? 'idle' : 'up',
            progress: total > 0 ? pos / total : undefined,
          }
        }),
      }
    },
    actions: [
      {
        id: 'refresh',
        label: t('jf.refresh'),
        icon: 'sync',
        run: async () => {
          await request(c, '/Library/Refresh', { method: 'POST', headers })
          return t('jf.refreshed')
        },
      },
    ],
  }
}
