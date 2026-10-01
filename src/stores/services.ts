import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem } from '../lib/storage'
import type { ServiceConfig } from '../services/types'

export const useServices = defineStore('services', () => {
  const list = ref<ServiceConfig[]>([])
  const ready = ref(false)

  const persist = () => setItem('services', JSON.parse(JSON.stringify(list.value)))

  async function load() {
    list.value = await getItem<ServiceConfig[]>('services', [])
    ready.value = true
  }

  const get = (id: string | null | undefined) => list.value.find((s) => s.id === id)

  function add(data: Omit<ServiceConfig, 'id'>) {
    const service: ServiceConfig = { ...data, id: crypto.randomUUID() }
    list.value.push(service)
    persist()
    return service
  }

  function update(id: string, data: Omit<ServiceConfig, 'id'>) {
    const i = list.value.findIndex((s) => s.id === id)
    if (i >= 0) {
      list.value[i] = { ...data, id }
      persist()
    }
  }

  function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)
    persist()
  }

  return { list, ready, load, get, add, update, remove }
})
