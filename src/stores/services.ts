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
      list.value[i] = {
        ...data,
        favorite: list.value[i].favorite,
        group: list.value[i].group,
        id,
      }
      persist()
    }
  }

  function updateOrganization(id: string, organization: Pick<ServiceConfig, 'favorite' | 'group'>) {
    const service = get(id)
    if (!service) return

    service.favorite = organization.favorite
    service.group = organization.group?.trim() || undefined
    persist()
  }

  function move(id: string, offset: -1 | 1) {
    const index = list.value.findIndex((service) => service.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= list.value.length) return

    const [service] = list.value.splice(index, 1)
    if (service) list.value.splice(target, 0, service)
    persist()
  }

  function organize(
    id: string,
    targetId: string | null,
    organization: Pick<ServiceConfig, 'favorite' | 'group'>,
  ) {
    const index = list.value.findIndex((service) => service.id === id)
    if (index < 0 || id === targetId) return

    const [service] = list.value.splice(index, 1)
    if (!service) return

    service.favorite = organization.favorite
    service.group = organization.group?.trim() || undefined

    const targetIndex = targetId
      ? list.value.findIndex((item) => item.id === targetId)
      : -1
    list.value.splice(targetIndex < 0 ? list.value.length : targetIndex, 0, service)
    persist()
  }

  function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)
    persist()
  }

  return { list, ready, load, get, add, update, updateOrganization, move, organize, remove }
})
