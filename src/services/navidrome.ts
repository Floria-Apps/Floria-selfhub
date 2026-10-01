import { md5 } from 'js-md5'
import { getJson } from '../lib/http'
import { fmtNumber } from '../lib/format'
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
          ? 'Usuário ou senha incorretos.'
          : `O Navidrome recusou o pedido: ${res?.error?.message ?? 'resposta inválida'}.`,
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
          { label: 'Tocando agora', value: String(entries.length), icon: 'headphones', tone: 'primary' },
          { label: 'Faixas na biblioteca', value: fmtNumber(scan.scanStatus?.count), icon: 'library_music', tone: 'secondary' },
          { label: 'Varredura', value: scanning ? 'Em andamento' : 'Parada', icon: 'radar', tone: 'tertiary' },
          { label: 'Versão', value: String(ping.serverVersion ?? ping.version ?? '-'), icon: 'info', tone: 'neutral' },
        ],
        itemsTitle: 'Tocando agora',
        emptyText: 'Nenhuma música tocando no momento.',
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
        label: 'Iniciar varredura',
        icon: 'radar',
        run: async () => {
          await call('startScan')
          return 'Varredura da biblioteca iniciada.'
        },
      },
    ],
  }
}
