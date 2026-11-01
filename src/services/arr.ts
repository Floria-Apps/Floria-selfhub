import { getJson } from '../lib/http'
import { t } from '../lib/i18n'
import type { Health, ServiceAdapter, ServiceConfig, ServiceType } from './types'

interface ArrServiceDefinition {
  apiPath: string
  healthPath?: string
}

const ARR_SERVICES: Partial<Record<ServiceType, ArrServiceDefinition>> = {
  sonarr: { apiPath: '/api/v3', healthPath: '/api/v3/health' },
  radarr: { apiPath: '/api/v3', healthPath: '/api/v3/health' },
  lidarr: { apiPath: '/api/v1', healthPath: '/api/v1/health' },
  readarr: { apiPath: '/api/v1', healthPath: '/api/v1/health' },
  prowlarr: { apiPath: '/api/v1', healthPath: '/api/v1/health' },
  bazarr: { apiPath: '/api', healthPath: '/api/system/health' },
}

interface ArrSystemStatus {
  version?: string
  packageVersion?: string
  bazarr_version?: string
  branch?: string
  instanceName?: string
  data?: ArrSystemStatus
}

interface ArrHealthIssue {
  type?: string
  message?: string
  wikiUrl?: string
}

type ArrHealthResponse = ArrHealthIssue[] | { data?: ArrHealthIssue[] }

export function arr(c: ServiceConfig): ServiceAdapter {
  const definition = ARR_SERVICES[c.type]
  if (!definition) throw new Error(t('arr.unsupported'))
  if (!c.token) throw new Error(t('arr.apiKeyRequired'))

  const headers = {
    Accept: 'application/json',
    'X-Api-Key': c.token,
  }

  return {
    async snapshot() {
      const [rawStatus, rawHealth] = await Promise.all([
        getJson<ArrSystemStatus>(c, `${definition.apiPath}/system/status`, { headers }),
        definition.healthPath
          ? getJson<ArrHealthResponse>(c, definition.healthPath, { headers })
          : Promise.resolve([] as ArrHealthIssue[]),
      ])
      const status = rawStatus.data ?? rawStatus
      const issues = Array.isArray(rawHealth)
        ? rawHealth
        : Array.isArray(rawHealth.data)
          ? rawHealth.data
          : []
      const errors = issues.filter((issue) => issue.type?.toLowerCase() === 'error').length
      const warnings = issues.filter((issue) => issue.type?.toLowerCase() === 'warning').length
      const health: Health = errors ? 'bad' : warnings ? 'warn' : 'ok'
      const version = status.version ?? status.bazarr_version ?? status.packageVersion ?? '-'

      return {
        health,
        stats: [
          {
            label: t('arr.version'),
            value: version,
            hint: status.branch ?? status.instanceName,
            icon: 'info',
            tone: 'primary',
          },
          {
            label: t('arr.healthChecks'),
            value: String(issues.length),
            icon: issues.length ? 'warning' : 'check_circle',
            tone: errors ? 'tertiary' : warnings ? 'secondary' : 'neutral',
          },
        ],
        itemsTitle: t('arr.healthChecks'),
        emptyText: t('arr.noIssues'),
        items: issues.map((issue, index) => ({
          id: `${issue.type ?? 'issue'}-${index}`,
          title: issue.message || t('arr.unnamedIssue'),
          subtitle: issue.type,
          status: issue.type?.toLowerCase() === 'error'
            ? 'down'
            : issue.type?.toLowerCase() === 'warning'
              ? 'warn'
              : 'idle',
        })),
      }
    },
  }
}
