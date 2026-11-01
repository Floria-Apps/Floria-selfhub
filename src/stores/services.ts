import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getItem, setItem } from '../lib/storage'
import type { ServiceConfig, ServiceType } from '../services/types'

export const DEFAULT_SERVICE_GROUPS: Partial<Record<ServiceType, string>> = {
  sonarr: '*arr',
  radarr: '*arr',
  lidarr: '*arr',
  readarr: '*arr',
  prowlarr: '*arr',
  bazarr: '*arr',
  jellyseerr: 'Mídia',
  immich: 'Mídia',
  qbittorrent: 'Mídia',
  jellyfin: 'Mídia',
  navidrome: 'Mídia',
  'multi-scrobbler': 'Mídia',
  kuma: 'Monitoramento',
  gatus: 'Monitoramento',
  speedtest: 'Rede',
  adguard: 'Rede',
  cup: 'Docker',
  wud: 'Docker',
}

const DEFAULT_GROUP_ORDER = ['*arr', 'Mídia', 'Monitoramento', 'Rede', 'Docker']

export const useServices = defineStore('services', () => {
  const list = ref<ServiceConfig[]>([])
  const groupOrder = ref<string[]>([])
  const ready = ref(false)

  const persist = () => setItem('services', JSON.parse(JSON.stringify(list.value)))
  const persistGroups = () => setItem('serviceGroups', [...groupOrder.value])
  const groups = computed(() => {
    const result = [...groupOrder.value]
    for (const service of list.value) {
      const group = service.group?.trim()
      if (group && !result.some((item) => item.toLowerCase() === group.toLowerCase())) {
        result.push(group)
      }
    }
    return result
  })

  function ensureGroup(value?: string) {
    const group = value?.trim()
    if (!group || groupOrder.value.some((item) => item.toLowerCase() === group.toLowerCase())) return
    groupOrder.value.push(group)
    persistGroups()
  }

  function canonicalGroup(value?: string) {
    const group = value?.trim()
    return group
      ? groupOrder.value.find((item) => item.toLowerCase() === group.toLowerCase()) ?? group
      : undefined
  }

  async function load() {
    const [savedServices, savedGroups] = await Promise.all([
      getItem<ServiceConfig[]>('services', []),
      getItem<unknown>('serviceGroups', []),
    ])
    list.value = savedServices
    groupOrder.value = Array.isArray(savedGroups)
      ? savedGroups.reduce<string[]>((result, value) => {
          if (typeof value !== 'string') return result
          const group = value.trim()
          if (group && !result.some((item) => item.toLowerCase() === group.toLowerCase())) result.push(group)
          return result
        }, [])
      : []
    for (const defaultGroup of DEFAULT_GROUP_ORDER) {
      const hasUngroupedService = list.value.some(
        (service) => !service.group?.trim() && DEFAULT_SERVICE_GROUPS[service.type] === defaultGroup,
      )
      if (hasUngroupedService) ensureGroup(defaultGroup)
    }

    let normalizedServices = false
    for (const service of list.value) {
      const groupName = service.group?.trim() || DEFAULT_SERVICE_GROUPS[service.type]
      ensureGroup(groupName)
      const group = canonicalGroup(groupName)
      if (group !== service.group) {
        service.group = group
        normalizedServices = true
      }
    }
    if (normalizedServices) persist()
    ready.value = true
  }

  const get = (id: string | null | undefined) => list.value.find((s) => s.id === id)

  function add(data: Omit<ServiceConfig, 'id'>) {
    const group = data.group?.trim() || DEFAULT_SERVICE_GROUPS[data.type]
    ensureGroup(group)
    const service: ServiceConfig = { ...data, group: canonicalGroup(group), id: crypto.randomUUID() }
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
        monitoringPaused: list.value[i].monitoringPaused,
        id,
      }
      persist()
    }
  }

  function updateOrganization(id: string, organization: Pick<ServiceConfig, 'favorite' | 'group'>) {
    const service = get(id)
    if (!service) return

    ensureGroup(organization.group)
    service.favorite = organization.favorite
    service.group = canonicalGroup(organization.group)
    persist()
  }

  function updateAlias(id: string, alias: string) {
    const service = get(id)
    if (!service) return

    const normalizedAlias = alias.trim()
    service.alias = normalizedAlias || undefined
    persist()
  }

  function setMonitoringPaused(id: string, paused: boolean) {
    const service = get(id)
    if (!service || service.monitoringPaused === paused) return

    service.monitoringPaused = paused
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

  function moveBefore(id: string, targetId: string) {
    if (id === targetId) return
    const index = list.value.findIndex((service) => service.id === id)
    const targetIndex = list.value.findIndex((service) => service.id === targetId)
    if (index < 0 || targetIndex < 0) return

    const [service] = list.value.splice(index, 1)
    if (!service) return
    const adjustedTarget = list.value.findIndex((item) => item.id === targetId)
    list.value.splice(adjustedTarget, 0, service)
    persist()
  }

  function moveWithinGroup(id: string, offset: -1 | 1) {
    const index = list.value.findIndex((service) => service.id === id)
    if (index < 0) return

    const service = list.value[index]
    if (!service) return

    const siblings = list.value.filter((item) =>
      Boolean(item.favorite) === Boolean(service.favorite)
      && (service.favorite || (item.group?.trim().toLowerCase() ?? '') === (service.group?.trim().toLowerCase() ?? '')),
    )
    const siblingIndex = siblings.findIndex((item) => item.id === id)
    const target = siblings[siblingIndex + offset]
    if (!target) return

    list.value.splice(index, 1)
    const adjustedTarget = list.value.findIndex((item) => item.id === target.id)
    list.value.splice(adjustedTarget + (offset > 0 ? 1 : 0), 0, service)
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

    ensureGroup(organization.group)
    service.favorite = organization.favorite
    service.group = canonicalGroup(organization.group)

    const targetIndex = targetId
      ? list.value.findIndex((item) => item.id === targetId)
      : -1
    list.value.splice(targetIndex < 0 ? list.value.length : targetIndex, 0, service)
    persist()
  }

  function createGroup(value: string) {
    const group = value.trim()
    if (!group || groups.value.some((item) => item.toLowerCase() === group.toLowerCase())) {
      return false
    }

    groupOrder.value.push(group)
    persistGroups()
    return true
  }

  function moveGroup(name: string, offset: -1 | 1) {
    const index = groups.value.findIndex((group) => group === name)
    const target = index + offset
    if (index < 0 || target < 0 || target >= groups.value.length) return

    groupOrder.value = [...groups.value]
    const [group] = groupOrder.value.splice(index, 1)
    if (group) groupOrder.value.splice(target, 0, group)
    persistGroups()
  }

  function removeGroup(name: string) {
    if (list.value.some((service) => service.group?.trim().toLowerCase() === name.toLowerCase())) return false
    groupOrder.value = groups.value.filter((group) => group !== name)
    persistGroups()
    return true
  }

  function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)
    persist()
  }

  return {
    list,
    groups,
    ready,
    load,
    get,
    add,
    update,
    updateOrganization,
    updateAlias,
    setMonitoringPaused,
    move,
    moveBefore,
    organize,
    moveWithinGroup,
    createGroup,
    moveGroup,
    removeGroup,
    remove,
  }
})
