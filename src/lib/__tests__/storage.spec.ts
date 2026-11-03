import { beforeEach, describe, expect, it, vi } from 'vitest'

type Invocation = { command: string; args?: Record<string, unknown> }
const mocks = vi.hoisted(() => ({
  storedServices: [] as Record<string, unknown>[],
  credentials: {} as Record<string, Record<string, string>>,
  invocations: [] as Invocation[],
  failCredentialWrite: false,
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string, args?: Record<string, unknown>) => {
    mocks.invocations.push({ command, args })
    const serviceId = String(args?.serviceId ?? '')

    if (command === 'get_service_credentials') return mocks.credentials[serviceId] ?? null
    if (command === 'set_service_credentials') {
      if (mocks.failCredentialWrite) throw new Error('keyring unavailable')
      const value = args?.credentials as Record<string, string>
      if (Object.keys(value).length) mocks.credentials[serviceId] = value
      else delete mocks.credentials[serviceId]
    }
    if (command === 'delete_service_credentials') delete mocks.credentials[serviceId]
  }),
}))

vi.mock('../http', () => ({ isTauri: () => true }))
vi.mock('../i18n', () => ({
  usesSystemCredentialStore: true,
  t: (key: string) => key,
}))
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(async () => ({
    get: vi.fn(async (key: string) => key === 'services' ? mocks.storedServices : undefined),
    set: vi.fn(async (key: string, value: unknown) => {
      if (key === 'services') mocks.storedServices = value as Record<string, unknown>[]
    }),
    save: vi.fn(async () => undefined),
  })),
}))

describe('desktop credential storage', () => {
  beforeEach(async () => {
    mocks.storedServices = []
    mocks.credentials = {}
    mocks.invocations = []
    mocks.failCredentialWrite = false
    vi.resetModules()
  })

  it('migrates legacy credentials out of the config file and deletes them with the service', async () => {
    mocks.storedServices = [{
      id: 'service-1',
      type: 'sonarr',
      name: 'Sonarr',
      baseUrl: 'http://sonarr.local',
      token: 'secret-token',
      username: 'private-user',
      password: 'secret-password',
    }]

    const { getItem, setItem } = await import('../storage')
    const services = await getItem<Array<Record<string, unknown>>>('services', [])

    expect(services[0]).toMatchObject({
      token: 'secret-token',
      username: 'private-user',
      password: 'secret-password',
    })
    expect(mocks.storedServices[0]).not.toHaveProperty('token')
    expect(mocks.storedServices[0]).not.toHaveProperty('username')
    expect(mocks.storedServices[0]).not.toHaveProperty('password')
    expect(mocks.invocations[0]).toMatchObject({
      command: 'set_service_credentials',
      args: {
        serviceId: 'service-1',
        credentials: {
          token: 'secret-token',
          username: 'private-user',
          password: 'secret-password',
        },
      },
    })

    await setItem('services', [])
    expect(mocks.invocations[mocks.invocations.length - 1]).toEqual({
      command: 'delete_service_credentials',
      args: { serviceId: 'service-1' },
    })
    expect(mocks.credentials['service-1']).toBeUndefined()
  })

  it('writes new credentials only to the keyring and restores them on next load', async () => {
    const { getItem, setItem } = await import('../storage')
    const service = {
      id: 'service-2',
      type: 'jellyfin',
      name: 'Jellyfin',
      baseUrl: 'http://jellyfin.local',
      token: 'new-secret',
    }

    await setItem('services', [service])
    expect(mocks.storedServices[0]).not.toHaveProperty('token')
    expect(mocks.credentials['service-2']).toEqual({ token: 'new-secret' })

    vi.resetModules()
    const nextSession = await import('../storage')
    const loaded = await nextSession.getItem<Array<Record<string, unknown>>>('services', [])
    expect(loaded[0]).toMatchObject({ token: 'new-secret' })
  })

  it('keeps legacy credentials intact if the system keyring is unavailable', async () => {
    mocks.storedServices = [{
      id: 'service-3',
      type: 'sonarr',
      name: 'Sonarr',
      baseUrl: 'http://sonarr.local',
      token: 'legacy-secret',
    }]
    mocks.failCredentialWrite = true
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { getItem } = await import('../storage')
      await expect(getItem('services', [])).rejects.toThrow('err.storageRead')
      expect(mocks.storedServices[0]).toHaveProperty('token', 'legacy-secret')
    } finally {
      log.mockRestore()
    }
  })
})
