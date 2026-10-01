import { getJson, request } from '../lib/http'
import { fmtClock, fmtNumber } from '../lib/format'
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
          { label: 'Sessões ativas', value: String(playing.length), icon: 'play_circle', tone: 'primary' },
          { label: 'Filmes', value: fmtNumber(counts.MovieCount), icon: 'movie', tone: 'secondary' },
          { label: 'Séries', value: fmtNumber(counts.SeriesCount), icon: 'tv', tone: 'tertiary' },
          { label: 'Episódios', value: fmtNumber(counts.EpisodeCount), icon: 'video_library', tone: 'neutral' },
          { label: 'Músicas', value: fmtNumber(counts.SongCount), icon: 'music_note', tone: 'secondary' },
          { label: 'Versão', value: String(info.Version ?? '-'), hint: info.ServerName, icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: 'Assistindo agora',
        emptyText: 'Ninguém está assistindo agora.',
        items: playing.map((s) => {
          const item = s.NowPlayingItem
          const pos = (s.PlayState?.PositionTicks ?? 0) / 1e7
          const total = (item.RunTimeTicks ?? 0) / 1e7
          return {
            id: s.Id,
            title: item.SeriesName ? `${item.SeriesName} - ${item.Name}` : item.Name,
            subtitle: `${s.UserName} em ${s.DeviceName}`,
            trailing: s.PlayState?.IsPaused ? 'Pausado' : fmtClock(pos),
            status: s.PlayState?.IsPaused ? 'idle' : 'up',
            progress: total > 0 ? pos / total : undefined,
          }
        }),
      }
    },
    actions: [
      {
        id: 'refresh',
        label: 'Atualizar bibliotecas',
        icon: 'sync',
        run: async () => {
          await request(c, '/Library/Refresh', { method: 'POST', headers })
          return 'Atualização das bibliotecas iniciada.'
        },
      },
    ],
  }
}
