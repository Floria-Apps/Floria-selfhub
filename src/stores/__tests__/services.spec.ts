import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useServices } from '../services'

const saved = vi.hoisted(() => ({
  services: [] as unknown[],
  groups: [] as unknown[],
}))

vi.mock('../../lib/storage', () => ({
  getItem: vi.fn(async (key: string, fallback: unknown) => {
    if (key === 'services') return saved.services
    if (key === 'serviceGroups') return saved.groups
    return fallback
  }),
  setItem: vi.fn(async () => undefined),
}))

describe('service organization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    saved.services = []
    saved.groups = []
  })

  it('creates, reorders, and removes only empty groups', () => {
    const services = useServices()
    expect(services.createGroup('Mídia')).toBe(true)
    expect(services.createGroup('mídia')).toBe(false)
    expect(services.createGroup('Rede')).toBe(true)

    services.moveGroup('Rede', -1)
    expect(services.groups).toEqual(['Rede', 'Mídia'])
    expect(services.removeGroup('Rede')).toBe(true)
    expect(services.groups).toEqual(['Mídia'])
  })

  it('keeps global ordering and moves Home cards within their category', () => {
    const services = useServices()
    const first = services.add({ type: 'cup', name: 'A', baseUrl: 'http://a', group: 'Mídia' })
    const other = services.add({ type: 'cup', name: 'B', baseUrl: 'http://b', group: 'Rede' })
    const second = services.add({ type: 'cup', name: 'C', baseUrl: 'http://c', group: 'Mídia' })

    services.moveWithinGroup(second.id, -1)
    expect(services.list.map((service) => service.id)).toEqual([second.id, first.id, other.id])

    services.moveBefore(other.id, first.id)
    expect(services.list.map((service) => service.id)).toEqual([second.id, other.id, first.id])
    expect(services.removeGroup('Mídia')).toBe(false)
  })

  it('assigns new services to default categories while respecting custom groups', () => {
    const services = useServices()
    const sonarr = services.add({
      type: 'sonarr',
      name: 'Sonarr',
      baseUrl: 'http://sonarr',
    })
    const radarr = services.add({
      type: 'radarr',
      name: 'Radarr',
      baseUrl: 'http://radarr',
    })
    const jellyfin = services.add({
      type: 'jellyfin',
      name: 'Jellyfin',
      baseUrl: 'http://jellyfin',
      token: 'token',
    })
    const custom = services.add({
      type: 'sonarr',
      name: 'Custom Sonarr',
      baseUrl: 'http://custom-sonarr',
      group: 'Personalizado',
    })
    const jellyseerr = services.add({
      type: 'jellyseerr',
      name: 'Jellyseerr',
      baseUrl: 'http://jellyseerr',
      token: 'token',
    })
    const immich = services.add({
      type: 'immich',
      name: 'Immich',
      baseUrl: 'http://immich',
      token: 'token',
    })
    const qbittorrent = services.add({
      type: 'qbittorrent',
      name: 'qBittorrent',
      baseUrl: 'http://qbittorrent',
      username: 'user',
      password: 'pass',
    })

    expect(sonarr.group).toBe('*arr')
    expect(radarr.group).toBe('*arr')
    expect(jellyfin.group).toBe('Mídia')
    expect(custom.group).toBe('Personalizado')
    expect(jellyseerr.group).toBe('Mídia')
    expect(immich.group).toBe('Mídia')
    expect(qbittorrent.group).toBe('Mídia')
    expect(services.groups).toEqual(['*arr', 'Mídia', 'Personalizado'])
  })

  it('moves existing ungrouped services into their default categories', async () => {
    saved.groups = ['Personalizado']
    saved.services = [
      { id: 'sonarr', type: 'sonarr', name: 'Sonarr', baseUrl: 'http://sonarr' },
      { id: 'jellyfin', type: 'jellyfin', name: 'Jellyfin', baseUrl: 'http://jellyfin' },
      { id: 'cup', type: 'cup', name: 'Cup', baseUrl: 'http://cup' },
    ]

    const services = useServices()
    await services.load()

    expect(services.list.map((service) => service.group)).toEqual([
      '*arr',
      'Mídia',
      'Docker',
    ])
    expect(services.groups).toEqual(['Personalizado', '*arr', 'Mídia', 'Docker'])
  })

  it('persists monitoring pause across service edits and organization changes', () => {
    const services = useServices()
    const service = services.add({
      type: 'cup',
      name: 'Cup',
      baseUrl: 'http://cup',
    })

    services.setMonitoringPaused(service.id, true)
    services.updateOrganization(service.id, {
      favorite: true,
      group: 'Infra',
    })
    services.update(service.id, {
      type: 'cup',
      name: 'Cup edited',
      baseUrl: 'http://cup',
    })

    expect(services.get(service.id)).toMatchObject({
      favorite: true,
      group: 'Infra',
      monitoringPaused: true,
    })
  })

  it('updates and clears a service instance nickname', () => {
    const services = useServices()
    const service = services.add({
      type: 'navidrome',
      name: 'Navidrome',
      baseUrl: 'http://music',
    })

    services.updateAlias(service.id, ' Debian ')
    expect(services.get(service.id)?.alias).toBe('Debian')

    services.updateAlias(service.id, ' ')
    expect(services.get(service.id)?.alias).toBeUndefined()
  })
})
