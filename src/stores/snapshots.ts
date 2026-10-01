import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
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

const POLL_MS = 30_000

export const useSnapshots = defineStore('snapshots', () => {
  const services = useServices()
  const ui = useUi()

  const states = reactive<Record<string, SnapshotState>>({})
  const busyActions = reactive<Record<string, boolean>>({})
  const now = ref(Date.now())

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
    } catch (e) {
      // Mantém os últimos dados bons na tela e marca o erro
      states[id] = { loading: false, data: prev.data, updatedAt: prev.updatedAt, error: (e as Error).message }
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

  let timer: ReturnType<typeof setInterval> | undefined
  function start() {
    refreshAll()
    clearInterval(timer)
    timer = setInterval(() => {
      now.value = Date.now()
      if (!document.hidden) refreshAll()
    }, POLL_MS)
    setInterval(() => (now.value = Date.now()), 10_000)
  }

  return { states, busyActions, now, stateOf, refresh, refreshAll, actionsFor, runAction, start }
})
