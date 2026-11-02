import { SERVICE_TYPES } from '../services/registry'
import type { ServiceConfig } from '../services/types'
import type { Prefs } from '../stores/ui'

export type ServiceDraft = Omit<ServiceConfig, 'id'>

export interface ConfigFile {
  app: 'selfhub'
  version: 1
  services: ServiceDraft[]
  groups?: string[]
  prefs?: unknown
}

export function buildConfig(services: ServiceConfig[], prefs: Prefs, groups: string[] = []): string {
  const file: ConfigFile = {
    app: 'selfhub',
    version: 1,
    services: services.map(({ id: _id, token: _token, username: _username, password: _password, ...rest }) => rest),
    groups,
    prefs,
  }
  return JSON.stringify(file, null, 2)
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)

/** Valida o texto colado e devolve só os campos conhecidos. Lança erro se não for um arquivo do SelfHub. */
export function parseConfig(text: string): { services: ServiceDraft[]; groups: string[]; prefs: unknown } {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('invalid')
  }
  if (!data || data.app !== 'selfhub' || !Array.isArray(data.services)) throw new Error('invalid')

  const services: ServiceDraft[] = []
  for (const raw of data.services) {
    if (!raw || !SERVICE_TYPES.includes(raw.type) || !str(raw.name) || !str(raw.baseUrl)) throw new Error('invalid')
    services.push({
      type: raw.type,
      name: raw.name.trim(),
      alias: str(raw.alias)?.trim() || undefined,
      baseUrl: raw.baseUrl.trim(),
      token: str(raw.token),
      username: str(raw.username),
      password: typeof raw.password === 'string' ? raw.password : undefined,
      slug: str(raw.slug),
      insecure: raw.insecure === true,
      favorite: raw.favorite === true,
      group: str(raw.group),
      monitoringPaused: raw.monitoringPaused === true,
    })
  }
  const groups: string[] = []
  if (Array.isArray(data.groups)) {
    for (const value of data.groups) {
      if (typeof value !== 'string') continue
      const group = value.trim()
      if (group && !groups.includes(group)) groups.push(group)
    }
  }

  return { services, groups, prefs: data.prefs }
}

export const serviceKey = (s: ServiceDraft) =>
  `${s.type}|${s.baseUrl.replace(/\/+$/, '')}|${s.name}|${s.alias?.trim().toLowerCase() ?? ''}`

/** Copia texto para a área de transferência, com plano B para webviews que bloqueiam a API moderna */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  }
}
