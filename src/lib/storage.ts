import { isTauri } from './http'

// Dados ficam em um arquivo JSON local (plugin-store) no app, ou no localStorage no navegador.
// Atenção: tokens e senhas ficam em texto puro nesse arquivo.
let storePromise: Promise<any> | null = null

function tauriStore() {
  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store').then((m) =>
      m.load('selfhub.json', { autoSave: true } as any),
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
  } catch {
    return fallback
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
  }
}
