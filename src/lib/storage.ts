import { isTauri } from './http'
import { t } from './i18n'
import type { Store } from '@tauri-apps/plugin-store'

// Dados ficam em um arquivo JSON local (plugin-store) no app, ou no localStorage no navegador.
// Atenção: tokens e senhas ficam em texto puro nesse arquivo.
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

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    if (isTauri()) {
      const store = await tauriStore()
      const value = await store.get(key)
      return (value ?? fallback) as T
    }
    const raw = localStorage.getItem(`selfhub:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.error(`Falha ao carregar ${key}`, error)
    throw new Error(t('err.storageRead'))
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  try {
    if (isTauri()) {
      const store = await tauriStore()
      await store.set(key, value)
      await store.save()
    } else {
      localStorage.setItem(`selfhub:${key}`, JSON.stringify(value))
    }
  } catch (e) {
    console.error('Falha ao salvar', key, e)
    storageErrorReporter?.(new Error(t('err.storageWrite')))
  }
}
