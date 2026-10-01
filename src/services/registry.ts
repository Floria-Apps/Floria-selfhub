import { gatus } from './gatus'
import { jellyfin } from './jellyfin'
import { kuma } from './kuma'
import { navidrome } from './navidrome'
import { speedtest } from './speedtest'
import type { ServiceAdapter, ServiceConfig, ServiceMeta, ServiceType } from './types'

export const SERVICE_TYPES: ServiceType[] = ['jellyfin', 'navidrome', 'kuma', 'gatus', 'speedtest']

export const META: Record<ServiceType, ServiceMeta> = {
  jellyfin: {
    type: 'jellyfin',
    label: 'Jellyfin',
    icon: 'movie',
    color: '#a95fe0',
    description: 'Sessões, filmes, séries e músicas',
    urlPlaceholder: 'http://192.168.0.10:8096',
    fields: ['token'],
    tokenLabel: 'Chave de API',
    tokenHint: 'No Jellyfin: Painel, Avançado, Chaves de API.',
  },
  navidrome: {
    type: 'navidrome',
    label: 'Navidrome',
    icon: 'library_music',
    color: '#ff8a3d',
    description: 'Tocando agora e biblioteca de músicas',
    urlPlaceholder: 'http://192.168.0.10:4533',
    fields: ['username', 'password'],
  },
  kuma: {
    type: 'kuma',
    label: 'Uptime Kuma',
    icon: 'monitor_heart',
    color: '#3ecf8e',
    description: 'Monitores de uma página de status',
    urlPlaceholder: 'http://192.168.0.10:3001',
    fields: ['slug'],
    slugHint: 'A parte final do endereço da página de status, depois de /status/.',
  },
  gatus: {
    type: 'gatus',
    label: 'Gatus',
    icon: 'vital_signs',
    color: '#4c9dff',
    description: 'Saúde de todos os endpoints',
    urlPlaceholder: 'http://192.168.0.10:8080',
    fields: [],
  },
  speedtest: {
    type: 'speedtest',
    label: 'Speedtest Tracker',
    icon: 'speed',
    color: '#ff5c8a',
    description: 'Velocidade da internet e histórico',
    urlPlaceholder: 'http://192.168.0.10:8765',
    fields: ['token'],
    tokenLabel: 'Token de API',
    tokenHint: 'No menu do usuário: Tokens de API. Marque a permissão de rodar testes para usar o botão.',
  },
}

const FACTORIES: Record<ServiceType, (c: ServiceConfig) => ServiceAdapter> = {
  jellyfin,
  navidrome,
  kuma,
  gatus,
  speedtest,
}

export const createAdapter = (c: ServiceConfig) => FACTORIES[c.type](c)
