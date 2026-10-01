import type { ServiceConfig } from '../services/types'

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface ReqOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function messageFor(status: number) {
  if (status === 401 || status === 403) return 'Acesso negado. Confira o token, o usuário e a senha.'
  if (status === 404) return 'Endereço não encontrado. Confira a URL e a versão do serviço.'
  return `O serviço respondeu com o erro ${status}.`
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
      throw new Error('Tempo esgotado. O serviço não respondeu em 10 segundos.')
    throw new Error('Não foi possível conectar. Confira o endereço e se o serviço está no ar.')
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
