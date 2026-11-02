import { describe, expect, it } from 'vitest'
import { buildConfig, parseConfig, serviceKey } from '../config'

describe('configuration export', () => {
  it('omits service credentials from exported JSON', () => {
    const json = buildConfig([{
      id: 'service-id',
      type: 'sonarr',
      name: 'Sonarr',
      baseUrl: 'http://sonarr.local',
      token: 'secret-token',
      username: 'private-user',
      password: 'secret-password',
    }], {} as never)

    expect(json).not.toContain('secret-token')
    expect(json).not.toContain('private-user')
    expect(json).not.toContain('secret-password')
    expect(JSON.parse(json).services[0]).not.toHaveProperty('token')
    expect(JSON.parse(json).services[0]).not.toHaveProperty('username')
    expect(JSON.parse(json).services[0]).not.toHaveProperty('password')
  })
})

describe('configuration groups', () => {
  it('loads named groups while ignoring invalid and duplicate entries', () => {
    const config = parseConfig(JSON.stringify({
      app: 'selfhub',
      version: 1,
      services: [],
      groups: ['Media', ' Media ', '', 3, 'Network'],
    }))

    expect(config.groups).toEqual(['Media', 'Network'])
  })

  it('continues to accept older configs without groups', () => {
    const config = parseConfig(JSON.stringify({
      app: 'selfhub',
      version: 1,
      services: [],
    }))

    expect(config.groups).toEqual([])
  })

  it('preserves intentionally paused services during import', () => {
    const config = parseConfig(JSON.stringify({
      app: 'selfhub',
      version: 1,
      services: [{
        type: 'cup',
        name: 'Cup',
        baseUrl: 'http://localhost',
        monitoringPaused: true,
      }],
    }))

    expect(config.services[0]?.monitoringPaused).toBe(true)
  })

  it('preserves aliases and treats named instances as distinct during import', () => {
    const config = parseConfig(JSON.stringify({
      app: 'selfhub',
      version: 1,
      services: [
        { type: 'navidrome', name: 'Navidrome', alias: 'Debian', baseUrl: 'http://music' },
        { type: 'navidrome', name: 'Navidrome', alias: 'PC', baseUrl: 'http://music' },
      ],
    }))

    expect(config.services.map((service) => service.alias)).toEqual(['Debian', 'PC'])
    expect(serviceKey(config.services[0]!)).not.toBe(serviceKey(config.services[1]!))
  })
})
