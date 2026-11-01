import { defineStore } from 'pinia'
import { reactive, ref, shallowReactive, watch } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { isPermissionGranted, sendNotification } from '@tauri-apps/plugin-notification'
import { t } from '../lib/i18n'
import { createAdapter } from '../services/registry'
import type { ServiceAction, ServiceAdapter, ServiceConfig, ServiceSnapshot } from '../services/types'
import {
  HISTORY_LIMIT,
  HISTORY_RETENTION,
  HISTORY_SAMPLE_INTERVAL,
  makeHistorySample,
  normalizeHistory,
  type HistorySample,
} from '../lib/history'
import { getItem, setItem } from '../lib/storage'
import { useServices } from './services'
import { useUi } from './ui'

export interface SnapshotState {
  loading: boolean
  error?: string
  data?: ServiceSnapshot
  updatedAt?: number
}

export const useSnapshots = defineStore('snapshots', () => {
  const services = useServices()
  const ui = useUi()

  const states = reactive<Record<string, SnapshotState>>({})
  const busyActions = reactive<Record<string, boolean>>({})
  const adapterCache = shallowReactive(new Map<string, { config: ServiceConfig; adapter: ServiceAdapter }>())
  const history = ref<Record<string, HistorySample[]>>({})
  const now = ref(Date.now())
  const healthyById = new Map<string, boolean>()

  async function notifyStatusChange(serviceName: string, healthy: boolean) {
    if (!isTauri() || !ui.notificationsEnabled) return

    try {
      if (!(await isPermissionGranted())) {
        ui.notificationsEnabled = false
        ui.showToast(t('notification.permissionDenied'), 'error')
        return
      }
      sendNotification({
        title: t('notification.title'),
        body: t(healthy ? 'notification.recovered' : 'notification.issue', { name: serviceName }),
      })
    } catch (error) {
      console.error('Falha ao enviar notificação de status', error)
      ui.showToast(t('notification.failed'), 'error')
    }
  }

  const stateOf = (id: string | null | undefined): SnapshotState | undefined =>
    id ? states[id] : undefined

  const historyOf = (id: string | null | undefined): HistorySample[] =>
    id ? history.value[id] ?? [] : []

  async function adapterFor(config: ServiceConfig) {
    const cached = adapterCache.get(config.id)
    if (cached?.config === config) return cached.adapter

    const adapter = await createAdapter(config)
    if (services.get(config.id) === config) {
      adapterCache.set(config.id, { config, adapter })
    }
    return adapter
  }

  async function loadActions(id: string) {
    const config = services.get(id)
    if (!config || adapterCache.get(id)?.config === config) return

    try {
      await adapterFor(config)
    } catch (error) {
      console.error(`Falha ao carregar ações do serviço ${config.name}`, error)
      ui.showToast((error as Error).message, 'error')
    }
  }

  function recordHistory(id: string, snapshot?: ServiceSnapshot, failed = false) {
    const sample = makeHistorySample(snapshot, Date.now(), failed)
    const samples = history.value[id] ?? []
    const previous = samples[samples.length - 1]

    if (
      previous
      && sample.at - previous.at < HISTORY_SAMPLE_INTERVAL
      && sample.health === previous.health
    ) return

    history.value[id] = [
      ...samples.filter((entry) => entry.at >= sample.at - HISTORY_RETENTION),
      sample,
    ].slice(-HISTORY_LIMIT)
    void setItem('history', JSON.parse(JSON.stringify(history.value)))
  }

  async function refresh(id: string) {
    const config = services.get(id)
    if (!config || config.monitoringPaused) return
    const prev = states[id] ?? { loading: false }
    if (prev.loading) return
    states[id] = { ...prev, loading: true }
    try {
      const adapter = await adapterFor(config)
      const data = await adapter.snapshot()
      if (services.get(id)?.monitoringPaused) {
        states[id] = { ...prev, loading: false }
        return
      }

      states[id] = { loading: false, data, updatedAt: Date.now() }
      recordHistory(id, data)
      const healthy = data.health === 'ok'
      const previousHealthy = healthyById.get(id)
      healthyById.set(id, healthy)
      if (previousHealthy !== undefined && previousHealthy !== healthy) {
        void notifyStatusChange(config.name, healthy)
      }
    } catch (e) {
      if (services.get(id)?.monitoringPaused) {
        states[id] = { ...prev, loading: false }
        return
      }

      // Mantém os últimos dados bons na tela e marca o erro
      states[id] = { loading: false, data: prev.data, updatedAt: prev.updatedAt, error: (e as Error).message }
      recordHistory(id, undefined, true)
      if (healthyById.get(id) === true) {
        healthyById.set(id, false)
        void notifyStatusChange(config.name, false)
      }
    }
  }

  const refreshAll = () =>
    Promise.allSettled(
      services.list
        .filter((service) => !service.monitoringPaused)
        .map((service) => refresh(service.id)),
    )

  function actionsFor(id: string): ServiceAction[] {
    const config = services.get(id)
    const cached = config ? adapterCache.get(id) : undefined
    return cached && cached.config === config ? cached.adapter.actions ?? [] : []
  }

  async function runAction(serviceId: string, action: ServiceAction) {
    const key = `${serviceId}:${action.id}`
    if (busyActions[key]) return
    busyActions[key] = true
    try {
      ui.showToast(await action.run())
      setTimeout(() => refresh(serviceId), 1500)
    } catch (e) {
      ui.showToast((e as Error).message, 'error')
    } finally {
      busyActions[key] = false
    }
  }

  let pollTimer: ReturnType<typeof setInterval> | undefined
  function schedule() {
    clearInterval(pollTimer)
    const seconds = ui.refreshSeconds
    if (seconds > 0) {
      pollTimer = setInterval(() => {
        refreshAll()
      }, seconds * 1000)
    }
  }

  async function start() {
    try {
      const saved = await getItem<unknown>('history', {})
      history.value = normalizeHistory(
        saved,
        services.list.map((service) => service.id),
      )
    } catch (error) {
      console.error('Falha ao carregar o histórico de serviços', error)
      ui.showToast(t('err.storageRead'), 'error')
    }

    refreshAll()
    schedule()
    watch(() => ui.refreshSeconds, schedule)
    setInterval(() => (now.value = Date.now()), 10_000)
  }

  return {
    states,
    busyActions,
    history,
    now,
    stateOf,
    historyOf,
    loadActions,
    refresh,
    refreshAll,
    actionsFor,
    runAction,
    start,
  }
})
