import { afterEach, describe, expect, it, vi } from 'vitest'
import { arr } from '../arr'
import { META, SERVICE_TYPES } from '../registry'
import type { ServiceConfig, ServiceType } from '../types'

const services: { type: ServiceType; prefix: string }[] = [
  { type: 'sonarr', prefix: '/api/v3' },
  { type: 'radarr', prefix: '/api/v3' },
  { type: 'lidarr', prefix: '/api/v1' },
  { type: 'readarr', prefix: '/api/v1' },
  { type: 'prowlarr', prefix: '/api/v1' },
  { type: 'bazarr', prefix: '/api' },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Arr service integrations', () => {
  it('registers each integration with API key configuration', () => {
    for (const { type } of services) {
      expect(SERVICE_TYPES).toContain(type)
      expect(META[type].fields).toContain('token')
    }
  })

  it.each(services)('checks the API and health for $type', async ({ type, prefix }) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = new URL(String(input))
      const body = url.pathname.endsWith('/health')
        ? [{ type: 'warning', message: 'Health warning' }]
        : { version: '1.2.3', branch: 'main' }

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const config: ServiceConfig = {
      id: type,
      type,
      name: type,
      baseUrl: 'http://localhost:8989',
      token: 'test-api-key',
    }
    const result = await arr(config).snapshot()

    expect(result.health).toBe('warn')
    expect(result.stats[0].value).toBe('1.2.3')
    expect(result.items[0].title).toBe('Health warning')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [input, init] of fetchMock.mock.calls) {
      expect(new URL(String(input)).pathname).toContain(`${prefix}/`)
      expect(new Headers(init?.headers).get('X-Api-Key')).toBe('test-api-key')
    }
  })

  it('requires an API key', () => {
    const config: ServiceConfig = {
      id: 'sonarr',
      type: 'sonarr',
      name: 'Sonarr',
      baseUrl: 'http://localhost:8989',
    }

    expect(() => arr(config)).toThrow(/key|chave/i)
  })
})
