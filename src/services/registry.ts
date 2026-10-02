import { adguard } from './adguard'
import { cup } from './cup'
import { gatus } from './gatus'
import { jellyfin } from './jellyfin'
import { kuma } from './kuma'
import { navidrome } from './navidrome'
import { speedtest } from './speedtest'
import { wud } from './wud'
import type { ServiceAdapter, ServiceConfig, ServiceMeta, ServiceType } from './types'

export const SERVICE_TYPES: ServiceType[] = [
  'jellyfin', 'navidrome', 'kuma', 'gatus', 'speedtest', 'cup', 'wud', 'adguard',
]

export const META: Record<ServiceType, ServiceMeta> = {
  jellyfin: {
    type: 'jellyfin',
    label: 'Jellyfin',
    icon: 'movie',
    color: '#a95fe0',
    description: 'meta.jellyfin.desc',
    urlPlaceholder: 'http://192.168.0.10:8096',
    fields: ['token'],
    tokenLabel: 'meta.jellyfin.tokenLabel',
    tokenHint: 'meta.jellyfin.tokenHint',
  },
  navidrome: {
    type: 'navidrome',
    label: 'Navidrome',
    icon: 'library_music',
    color: '#2f80ff',
    description: 'meta.navidrome.desc',
    urlPlaceholder: 'http://192.168.0.10:4533',
    fields: ['username', 'password'],
  },
  kuma: {
    type: 'kuma',
    label: 'Uptime Kuma',
    icon: 'monitor_heart',
    color: '#3ecf8e',
    description: 'meta.kuma.desc',
    urlPlaceholder: 'http://192.168.0.10:3001',
    fields: ['slug'],
    slugHint: 'meta.kuma.slugHint',
  },
  gatus: {
    type: 'gatus',
    label: 'Gatus',
    icon: 'vital_signs',
    color: '#ff8a3d',
    description: 'meta.gatus.desc',
    urlPlaceholder: 'http://192.168.0.10:8080',
    fields: [],
  },
  speedtest: {
    type: 'speedtest',
    label: 'Speedtest Tracker',
    icon: 'speed',
    color: '#ff5c8a',
    description: 'meta.speedtest.desc',
    urlPlaceholder: 'http://192.168.0.10:8765',
    fields: ['token'],
    tokenLabel: 'meta.speedtest.tokenLabel',
    tokenHint: 'meta.speedtest.tokenHint',
  },
  cup: {
    type: 'cup',
    label: 'Cup',
    icon: 'local_cafe',
    color: '#ffb300',
    description: 'meta.cup.desc',
    urlPlaceholder: 'http://192.168.0.10:8000',
    fields: [],
  },
  wud: {
    type: 'wud',
    label: "What's up Docker",
    icon: 'update',
    color: '#7c8cff',
    description: 'meta.wud.desc',
    urlPlaceholder: 'http://192.168.0.10:3000',
    fields: ['username', 'password'],
    authOptional: true,
  },
  adguard: {
    type: 'adguard',
    label: 'AdGuard Home',
    icon: 'shield',
    color: '#00b3a4',
    description: 'meta.adguard.desc',
    urlPlaceholder: 'http://192.168.0.10:3000',
    fields: ['username', 'password'],
    authOptional: true,
  },
}

const FACTORIES: Record<ServiceType, (c: ServiceConfig) => ServiceAdapter> = {
  jellyfin,
  navidrome,
  kuma,
  gatus,
  speedtest,
  cup,
  wud,
  adguard,
}

export const createAdapter = (c: ServiceConfig) => FACTORIES[c.type](c)
