import type { ServiceConfig } from '../services/types'

export function serviceDisplayName(service: Pick<ServiceConfig, 'name' | 'alias'>) {
  const alias = service.alias?.trim()
  return alias ? `${service.name} - ${alias}` : service.name
}

export function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
