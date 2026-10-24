import { adguard } from './adguard'
import { cup } from './cup'
import { gatus } from './gatus'
import { jellyfin } from './jellyfin'
import { kuma } from './kuma'
import { navidrome } from './navidrome'
import { speedtest } from './speedtest'
import { wud } from './wud'
import { multiScrobbler } from './multi-scrobbler'
import type { ServiceAdapter, ServiceConfig, ServiceMeta, ServiceType } from './types'

export const SERVICE_TYPES: ServiceType[] = [
  'jellyfin', 'navidrome', 'kuma', 'gatus', 'speedtest', 'cup', 'wud', 'adguard', 'multi-scrobbler',
]

export const META: Record<ServiceType, ServiceMeta> = {
  jellyfin: {
    type: 'jellyfin',
    label: 'Jellyfin',
    icon: 'video_library',
    color: '#8b5cf6',
    description: 'meta.jellyfin.desc',
    urlPlaceholder: 'http://192.168.0.10:8096',
    fields: ['token'],
    tokenLabel: 'meta.jellyfin.tokenLabel',
    tokenHint: 'meta.jellyfin.tokenHint',
  },
  navidrome: {
    type: 'navidrome',
    label: 'Navidrome',
    icon: 'album',
    color: '#2f80ff',
    description: 'meta.navidrome.desc',
    urlPlaceholder: 'http://192.168.0.10:4533',
    fields: ['username', 'password'],
  },
  kuma: {
    type: 'kuma',
    label: 'Uptime Kuma',
    icon: 'filter_tilt_shift',
    color: '#5cdd8b',
    description: 'meta.kuma.desc',
    urlPlaceholder: 'http://192.168.0.10:3001',
    fields: ['slug'],
    slugHint: 'meta.kuma.slugHint',
  },
  gatus: {
    type: 'gatus',
    label: 'Gatus',
    icon: 'settings_suggest',
    color: '#5cdd8b',
    description: 'meta.gatus.desc',
    urlPlaceholder: 'http://192.168.0.10:8080',
    fields: [],
  },
  speedtest: {
    type: 'speedtest',
    label: 'Speedtest Tracker',
    icon: 'cruelty_free',
    color: '#FF5E00',
    description: 'meta.speedtest.desc',
    urlPlaceholder: 'http://192.168.0.10:8765',
    fields: ['token'],
    tokenLabel: 'meta.speedtest.tokenLabel',
    tokenHint: 'meta.speedtest.tokenHint',
  },
  cup: {
    type: 'cup',
    label: 'Cup',
    icon: 'local_drink',
    color: '#64748b',
    description: 'meta.cup.desc',
    urlPlaceholder: 'http://192.168.0.10:8000',
    fields: [],
  },
  wud: {
    type: 'wud',
    label: "What's up Docker",
    icon: 'update',
    color: '#38bdf8',
    description: 'meta.wud.desc',
    urlPlaceholder: 'http://192.168.0.10:3000',
    fields: ['username', 'password'],
    authOptional: true,
  },
  'multi-scrobbler': {
    type: 'multi-scrobbler',
    label: 'Multi-Scrobbler',
    icon: 'graphic_eq',
    color: '#FF5E00',
    description: 'meta.multiScrobbler.desc',
    urlPlaceholder: 'https://scrobbler.example.com',
    fields: [],
  },
  adguard: {
    type: 'adguard',
    label: 'AdGuard Home',
    icon: 'verified_user',
    color: '#68bc71',
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
  'multi-scrobbler': multiScrobbler,
}

export const createAdapter = (c: ServiceConfig) => FACTORIES[c.type](c)
