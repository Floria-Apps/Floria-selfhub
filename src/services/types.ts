export type ServiceType = 'jellyfin' | 'navidrome' | 'kuma' | 'gatus' | 'speedtest' | 'cup' | 'wud' | 'adguard'

export interface ServiceConfig {
  id: string
  type: ServiceType
  name: string
  baseUrl: string
  token?: string
  username?: string
  password?: string
  /** Uptime Kuma: identificador da página de status */
  slug?: string
  /** Aceitar certificado HTTPS autoassinado */
  insecure?: boolean
}

export type Tone = 'primary' | 'secondary' | 'tertiary' | 'neutral'
export type Health = 'ok' | 'warn' | 'bad'
export type ItemStatus = 'up' | 'down' | 'warn' | 'idle'

export interface Stat {
  label: string
  value: string
  hint?: string
  icon?: string
  tone?: Tone
}

export interface DetailItem {
  id: string
  title: string
  subtitle?: string
  trailing?: string
  status?: ItemStatus
  /** 0 a 1 */
  progress?: number
}

export interface ServiceSnapshot {
  health: Health
  stats: Stat[]
  itemsTitle: string
  emptyText: string
  items: DetailItem[]
}

export interface ServiceAction {
  id: string
  label: string
  icon: string
  /** Retorna a mensagem exibida ao concluir */
  run: () => Promise<string>
}

export interface ServiceAdapter {
  snapshot(): Promise<ServiceSnapshot>
  actions?: ServiceAction[]
}

export type FieldName = 'token' | 'username' | 'password' | 'slug'

export interface ServiceMeta {
  type: ServiceType
  label: string
  icon: string
  color: string
  description: string
  urlPlaceholder: string
  fields: FieldName[]
  tokenLabel?: string
  tokenHint?: string
  slugHint?: string
  /** Usuário e senha são opcionais (serviço pode estar sem login) */
  authOptional?: boolean
}
