import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { isTauri } from '@tauri-apps/api/core'
import { isPermissionGranted, sendNotification } from '@tauri-apps/plugin-notification'
import { t } from '../lib/i18n'
import { createAdapter } from '../services/registry'
import type { ServiceAction, ServiceSnapshot } from '../services/types'
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

  async function refresh(id: string) {
    const config = services.get(id)
    if (!config) return
    const prev = states[id] ?? { loading: false }
    if (prev.loading) return
    states[id] = { ...prev, loading: true }
    try {
      const data = await createAdapter(config).snapshot()
      states[id] = { loading: false, data, updatedAt: Date.now() }
      const healthy = data.health === 'ok'
      const previousHealthy = healthyById.get(id)
      healthyById.set(id, healthy)
      if (previousHealthy !== undefined && previousHealthy !== healthy) {
        void notifyStatusChange(config.name, healthy)
      }
    } catch (e) {
      // Mantém os últimos dados bons na tela e marca o erro
      states[id] = { loading: false, data: prev.data, updatedAt: prev.updatedAt, error: (e as Error).message }
      if (healthyById.get(id) === true) {
        healthyById.set(id, false)
        void notifyStatusChange(config.name, false)
      }
    }
  }

  const refreshAll = () => Promise.allSettled(services.list.map((s) => refresh(s.id)))

  function actionsFor(id: string): ServiceAction[] {
    const config = services.get(id)
    return config ? (createAdapter(config).actions ?? []) : []
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

  function start() {
    refreshAll()
    schedule()
    watch(() => ui.refreshSeconds, schedule)
    setInterval(() => (now.value = Date.now()), 10_000)
  }

  return { states, busyActions, now, stateOf, refresh, refreshAll, actionsFor, runAction, start }
})
