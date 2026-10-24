
import { getText } from '../lib/http'
import { t } from '../lib/i18n'
import type {
  DetailItem,
  ItemStatus,
  ServiceAdapter,
  ServiceConfig,
} from './types'

type Metric = {
  name: string
  labels: Record<string, string>
  value: number
}

/**
 * Interpreta as linhas de métricas do Prometheus.
 */
function parseMetrics(text: string): Metric[] {
  const result: Metric[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(
      /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)$/,
    )

    if (!match) continue

    const [, name, rawLabels = '', rawValue] = match
    const labels: Record<string, string> = {}

    for (const label of rawLabels.matchAll(
      /(\w+)="((?:\\.|[^"\\])*)"/g,
    )) {
      const key = label[1]
      const rawValue = label[2]

      if (key === undefined || rawValue === undefined) continue

      labels[key] = rawValue
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }

    const value = Number(rawValue)

    if (!Number.isFinite(value)) continue

    result.push({ name, labels, value })
  }

  return result
}

/**
 * Soma uma métrica para um nome específico.
 * Quando state é informado, considera apenas esse estado.
 */
function valueFor(
  metrics: Metric[],
  metricName: string,
  name: string,
  state?: string,
): number {
  return metrics
    .filter(
      (metric) =>
        metric.name === metricName &&
        metric.labels.name === name &&
        (state === undefined || metric.labels.state === state),
    )
    .reduce((total, metric) => total + metric.value, 0)
}

/**
 * Soma todos os valores de uma métrica.
 */
function totalFor(metrics: Metric[], metricName: string): number {
  return metrics
    .filter((metric) => metric.name === metricName)
    .reduce((total, metric) => total + metric.value, 0)
}

/**
 * Obtém os nomes existentes em um conjunto de métricas.
 */
function namesFor(metrics: Metric[], metricNames: string[]): string[] {
  const names = new Set<string>()

  for (const metric of metrics) {
    if (!metricNames.includes(metric.name)) continue

    const name = metric.labels.name

    if (name) names.add(name)
  }

  return [...names].sort((a, b) => a.localeCompare(b))
}

export const multiScrobbler = (
  c: ServiceConfig,
): ServiceAdapter => ({
  async snapshot() {
    const text = await getText(c, '/api/metrics')
    const metrics = parseMetrics(text)

    const clientNames = namesFor(metrics, [
      'multiscrobbler_client_queued',
      'multiscrobbler_client_deadletter',
      'multiscrobbler_client_issues',
      'multiscrobbler_client_plays',
    ])

    const sourceNames = namesFor(metrics, [
      'multiscrobbler_source_discovered',
      'multiscrobbler_source_dead',
      'multiscrobbler_source_queued',
      'multiscrobbler_source_issues',
      'multiscrobbler_source_plays',
    ])

    const clients: DetailItem[] = clientNames.map((name) => {
      const queued = valueFor(
        metrics,
        'multiscrobbler_client_queued',
        name,
      )

      const deadletter = valueFor(
        metrics,
        'multiscrobbler_client_deadletter',
        name,
      )

      const issues = valueFor(
        metrics,
        'multiscrobbler_client_issues',
        name,
      )

      const failed = valueFor(
        metrics,
        'multiscrobbler_client_plays',
        name,
        'failed',
      )

      const scrobbled = valueFor(
        metrics,
        'multiscrobbler_client_plays',
        name,
        'scrobbled',
      )

      const status: ItemStatus =
        issues > 0 || deadletter > 0 || failed > 0
          ? 'warn'
          : 'up'

      return {
        id: `client:${name}`,
        title: name,
        subtitle: t('multiScrobbler.clientSubtitle'),
        trailing:
          `${scrobbled} ${t('multiScrobbler.sentShort')} · ` +
          `${queued} ${t('multiScrobbler.queuedShort')}`,
        status,
      }
    })

    const sources: DetailItem[] = sourceNames.map((name) => {
      const discovered = valueFor(
        metrics,
        'multiscrobbler_source_discovered',
        name,
      )

      const queued = valueFor(
        metrics,
        'multiscrobbler_source_queued',
        name,
      )

      const dead = valueFor(
        metrics,
        'multiscrobbler_source_dead',
        name,
      )

      const issues = valueFor(
        metrics,
        'multiscrobbler_source_issues',
        name,
      )

      const failed = valueFor(
        metrics,
        'multiscrobbler_source_plays',
        name,
        'failed',
      )

      const status: ItemStatus =
        issues > 0 || dead > 0 || failed > 0
          ? 'warn'
          : 'up'

      return {
        id: `source:${name}`,
        title: name,
        subtitle: t('multiScrobbler.sourceSubtitle'),
        trailing:
          `${discovered} ${t('multiScrobbler.discoveredShort')} · ` +
          `${queued} ${t('multiScrobbler.queuedShort')}`,
        status,
      }
    })

    const items: DetailItem[] = [...sources, ...clients]

    const queued = totalFor(
      metrics,
      'multiscrobbler_client_queued',
    )

    const deadletter = totalFor(
      metrics,
      'multiscrobbler_client_deadletter',
    )

    const clientIssues = totalFor(
      metrics,
      'multiscrobbler_client_issues',
    )

    const sourceIssues = totalFor(
      metrics,
      'multiscrobbler_source_issues',
    )

    const sourceDead = totalFor(
      metrics,
      'multiscrobbler_source_dead',
    )

    const failed = metrics
      .filter(
        (metric) =>
          metric.name === 'multiscrobbler_client_plays' &&
          metric.labels.state === 'failed',
      )
      .reduce((total, metric) => total + metric.value, 0)

    const sourceFailed = metrics
      .filter(
        (metric) =>
          metric.name === 'multiscrobbler_source_plays' &&
          metric.labels.state === 'failed',
      )
      .reduce((total, metric) => total + metric.value, 0)

    const discovered = totalFor(
      metrics,
      'multiscrobbler_source_discovered',
    )

    const hasProblems =
      clientIssues > 0 ||
      sourceIssues > 0 ||
      sourceDead > 0 ||
      deadletter > 0 ||
      failed > 0 ||
      sourceFailed > 0

    return {
      health: hasProblems ? 'warn' : 'ok',

      stats: [
        {
          label: t('multiScrobbler.destinations'),
          value: String(clientNames.length),
          icon: 'share',
          tone: 'primary',
        },
        {
          label: t('multiScrobbler.discovered'),
          value: String(discovered),
          icon: 'library_music',
          tone: 'secondary',
        },
        {
          label: t('multiScrobbler.queued'),
          value: String(queued),
          icon: 'schedule',
          tone: queued > 0 ? 'tertiary' : 'neutral',
        },
        {
          label: t('multiScrobbler.deadletter'),
          value: String(deadletter),
          icon: 'error',
          tone: deadletter > 0 ? 'tertiary' : 'neutral',
        },
      ],

      itemsTitle: t('multiScrobbler.itemsTitle'),
      emptyText: t('multiScrobbler.empty'),
      items,
    }
  },
})
