import type { ServiceConfig } from '../services/types'
import { t } from './i18n'

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface ReqOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

/** Cabeçalho Authorization: Basic, com suporte a caracteres fora do ASCII */
export function basicAuth(user: string, pass: string): string {
  const bytes = new TextEncoder().encode(`${user}:${pass}`)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return `Basic ${btoa(bin)}`
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function messageFor(status: number) {
  if (status === 401 || status === 403) return t('err.denied')
  if (status === 404) return t('err.notFound')
  return t('err.status', { status })
}

/**
 * No app Tauri, a requisição sai pelo Rust (plugin-http) e não sofre com CORS.
 * No navegador (npm run dev) usa o fetch normal, que depende do CORS do serviço.
 */
export async function request(
  cfg: Pick<ServiceConfig, 'baseUrl' | 'insecure'>,
  path: string,
  opts: ReqOptions = {},
): Promise<Response> {
  const url = cfg.baseUrl.replace(/\/+$/, '') + path
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)

  try {
    const init: Record<string, unknown> = {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: controller.signal,
    }
    let res: Response
    if (isTauri()) {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
      if (cfg.insecure) init.danger = { acceptInvalidCerts: true, acceptInvalidHostnames: true }
      res = await tauriFetch(url, init as RequestInit)
    } else {
      res = await fetch(url, init as RequestInit)
    }
    if (!res.ok) throw new HttpError(res.status, messageFor(res.status))
    return res
  } catch (e) {
    if (e instanceof HttpError) throw e
    if ((e as Error).name === 'AbortError')
      throw new Error(t('err.timeout'))
    throw new Error(t('err.connect'))
  } finally {
    clearTimeout(timer)
  }
}

export async function getJson<T = any>(
  cfg: Pick<ServiceConfig, 'baseUrl' | 'insecure'>,
  path: string,
  opts: ReqOptions = {},
): Promise<T> {
  const res = await request(cfg, path, opts)
  return (await res.json()) as T
}
