import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './http'
import { usesSystemCredentialStore, t } from './i18n'
import type { ServiceConfig } from '../services/types'
import type { Store } from '@tauri-apps/plugin-store'

// Configurações ficam no arquivo local; no app Tauri, credenciais ficam no chaveiro do SO.
// O fallback web continua usando localStorage, que não criptografa os dados.
interface ServiceCredentials {
  token?: string
  username?: string
  password?: string
}

const credentialCache = new Map<string, string>()
let credentialQueue: Promise<void> = Promise.resolve()
let storePromise: Promise<Store> | null = null
let storageErrorReporter: ((error: Error) => void) | undefined

export function setStorageErrorReporter(reporter: (error: Error) => void) {
  storageErrorReporter = reporter
}

function tauriStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store').then((m) =>
      m.load('selfhub.json', { autoSave: false }),
    )
  }
  return storePromise
}

function credentialsOf(service: Partial<ServiceConfig>): ServiceCredentials {
  return {
    ...(service.token ? { token: service.token } : {}),
    ...(service.username ? { username: service.username } : {}),
    ...(service.password ? { password: service.password } : {}),
  }
}

function withoutCredentials(service: ServiceConfig): Omit<ServiceConfig, keyof ServiceCredentials> {
  const { token: _token, username: _username, password: _password, ...config } = service
  return config
}

function cacheCredentials(serviceId: string, credentials: ServiceCredentials) {
  credentialCache.set(serviceId, JSON.stringify(credentials))
}

async function loadDesktopServices(store: Store, raw: unknown): Promise<unknown> {
  if (!Array.isArray(raw)) return raw
  let migrated = false

  const services: unknown[] = []
  for (const value of raw) {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string') {
      services.push(value)
      continue
    }

    const service = value as ServiceConfig
    const legacyCredentials = credentialsOf(service)
    let credentials: ServiceCredentials

    if (Object.keys(legacyCredentials).length) {
      await invoke('set_service_credentials', {
        serviceId: service.id,
        credentials: legacyCredentials,
      })
      credentials = legacyCredentials
      migrated = true
    } else {
      credentials = await invoke<ServiceCredentials | null>('get_service_credentials', {
        serviceId: service.id,
      }) ?? {}
    }

    cacheCredentials(service.id, credentials)
    services.push({ ...withoutCredentials(service), ...credentials })
  }

  if (migrated) {
    await store.set('services', services.map((value) => {
      if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') return value
      return withoutCredentials(value as ServiceConfig)
    }))
    await store.save()
  }

  return services
}

async function saveDesktopServices(store: Store, raw: unknown) {
  const operation = credentialQueue.then(async () => {
    if (!Array.isArray(raw)) {
      await store.set('services', raw)
      await store.save()
      return
    }

    const services = raw as ServiceConfig[]
    const currentIds = new Set<string>()
    for (const service of services) {
      if (!service || typeof service.id !== 'string') continue
      currentIds.add(service.id)
      const credentials = credentialsOf(service)
      const serialized = JSON.stringify(credentials)
      if (credentialCache.get(service.id) === serialized) continue

      await invoke('set_service_credentials', {
        serviceId: service.id,
        credentials,
      })
      credentialCache.set(service.id, serialized)
    }

    for (const serviceId of credentialCache.keys()) {
      if (currentIds.has(serviceId)) continue
      await invoke('delete_service_credentials', { serviceId })
      credentialCache.delete(serviceId)
    }

    await store.set('services', services.map(withoutCredentials))
    await store.save()
  })

  credentialQueue = operation.catch(() => undefined)
  await operation
}

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    if (isTauri()) {
      const store = await tauriStore()
      const value = await store.get(key)
      if (key === 'services' && usesSystemCredentialStore) {
        return (await loadDesktopServices(store, value ?? fallback)) as T
      }
      return (value ?? fallback) as T
    }
    const raw = localStorage.getItem(`selfhub:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    console.error(`Falha ao carregar ${key}`)
    throw new Error(t('err.storageRead'))
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  try {
    if (isTauri()) {
      const store = await tauriStore()
      if (key === 'services' && usesSystemCredentialStore) {
        await saveDesktopServices(store, value)
      } else {
        await store.set(key, value)
        await store.save()
      }
    } else {
      localStorage.setItem(`selfhub:${key}`, JSON.stringify(value))
    }
  } catch {
    console.error('Falha ao salvar', key)
    storageErrorReporter?.(new Error(t('err.storageWrite')))
  }
}
