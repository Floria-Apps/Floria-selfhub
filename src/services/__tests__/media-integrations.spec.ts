import { afterEach, describe, expect, it, vi } from 'vitest'
import { immich } from '../immich'
import { jellyseerr } from '../jellyseerr'
import { qbittorrent } from '../qbittorrent'
import { createAdapter, META, SERVICE_TYPES } from '../registry'
import type { ServiceConfig } from '../types'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('media service integrations', () => {
  it('registers the new services with their expected credentials', () => {
    expect(SERVICE_TYPES).toEqual(expect.arrayContaining(['jellyseerr', 'qbittorrent', 'immich']))
    expect(META.jellyseerr.fields).toEqual(['token'])
    expect(META.immich.fields).toEqual(['token'])
    expect(META.qbittorrent.fields).toEqual(['username', 'password'])
  })

  it('creates adapters through the lazy service registry', async () => {
    const adapter = await createAdapter({
      id: 'media-test',
      type: 'jellyseerr',
      name: 'Jellyseerr',
      baseUrl: 'http://localhost:5055',
      token: 'test-key',
    })

    expect(adapter.snapshot).toBeTypeOf('function')
  })

  it('loads Jellyseerr version and recent requests with its API key', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname
      return new Response(JSON.stringify(
        path.endsWith('/status')
          ? { version: '2.0.0' }
          : {
              results: [{
                id: 21,
                status: 1,
                createdAt: '2026-10-31T12:00:00Z',
                media: { mediaType: 'movie', title: 'Example Movie' },
                requestedBy: { displayName: 'Alex' },
              }],
            },
      ), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Api-Key': new Headers(init?.headers).get('X-Api-Key') ?? '',
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const config: ServiceConfig = {
      id: 'jellyseerr',
      type: 'jellyseerr',
      name: 'Jellyseerr',
      baseUrl: 'http://localhost:5055',
      token: 'test-key',
    }
    const snapshot = await jellyseerr(config).snapshot()

    expect(snapshot.stats[1].value).toBe('1')
    expect(snapshot.items[0]).toMatchObject({
      title: 'Example Movie',
      status: 'warn',
    })
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-Api-Key')).toBe('test-key')
  })

  it('loads Immich library statistics with its API key', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname
      const response = path.endsWith('/about')
        ? { version: '1.9.0' }
        : {
            photos: 120,
            videos: 24,
            usageByUser: [{ userId: 'user-1', userName: 'Alex' }],
          }
      expect(new Headers(init?.headers).get('x-api-key')).toBe('admin-key')
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const config: ServiceConfig = {
      id: 'immich',
      type: 'immich',
      name: 'Immich',
      baseUrl: 'http://localhost:2283',
      token: 'admin-key',
    }
    const snapshot = await immich(config).snapshot()

    expect(snapshot.stats.map((stat) => stat.value)).toEqual(['1.9.0', '120', '24', '1'])
    expect(snapshot.items[0]?.title).toBe('Alex')
  })

  it('logs in to qBittorrent and requests transfer and torrent data with credentials', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname
      let body: unknown
      if (path.endsWith('/auth/login')) {
        expect(init?.method).toBe('POST')
        expect(String(init?.body)).toContain('username=admin')
        expect(String(init?.body)).toContain('password=secret')
        body = 'Ok.'
      } else if (path.endsWith('/transfer/info')) {
        body = { connection_status: 'connected', dl_info_speed: 1_500_000, up_info_speed: 500_000 }
      } else {
        body = [{
          hash: 'torrent-1',
          name: 'Example Download',
          state: 'downloading',
          progress: 0.5,
          dlspeed: 1_500_000,
          upspeed: 0,
          size: 1000,
          eta: 10,
        }]
      }

      return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const config: ServiceConfig = {
      id: 'qbittorrent',
      type: 'qbittorrent',
      name: 'qBittorrent',
      baseUrl: 'http://localhost:8080',
      username: 'admin',
      password: 'secret',
    }
    const snapshot = await qbittorrent(config).snapshot()

    expect(snapshot.health).toBe('ok')
    expect(snapshot.stats[1].value).toBe('1')
    expect(snapshot.items[0]).toMatchObject({
      title: 'Example Download',
      status: 'up',
      progress: 0.5,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.credentials).toBe('include')
    }
  })
})
