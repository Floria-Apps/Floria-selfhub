import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getItem, setItem } from '../lib/storage'
import { useServices } from './services'

export interface Tab {
  id: string
  /** null = página inicial (nova aba) */
  serviceId: string | null
}

const newId = () => crypto.randomUUID()

export const useTabs = defineStore('tabs', () => {
  const services = useServices()

  const tabs = ref<Tab[]>([{ id: newId(), serviceId: null }])
  const activeId = ref<string>(tabs.value[0].id)
  const panelOpen = ref(false)

  // Histórico de navegação entre abas (botões voltar e avançar)
  const nav = ref<string[]>([activeId.value])
  const navIndex = ref(0)

  const active = computed(() => tabs.value.find((t) => t.id === activeId.value))
  const activeService = computed(() => services.get(active.value?.serviceId))
  const canBack = computed(() => navIndex.value > 0)
  const canForward = computed(() => navIndex.value < nav.value.length - 1)

  function activate(id: string) {
    if (id === activeId.value) return
    nav.value = [...nav.value.slice(0, navIndex.value + 1), id]
    navIndex.value = nav.value.length - 1
    activeId.value = id
  }

  function back() {
    if (!canBack.value) return
    navIndex.value--
    activeId.value = nav.value[navIndex.value]
  }

  function forward() {
    if (!canForward.value) return
    navIndex.value++
    activeId.value = nav.value[navIndex.value]
  }

  function openNewTab() {
    const tab = { id: newId(), serviceId: null }
    tabs.value.push(tab)
    activate(tab.id)
  }

  function openService(serviceId: string) {
    const existing = tabs.value.find((t) => t.serviceId === serviceId)
    if (existing) return activate(existing.id)
    // Se a aba atual é uma página inicial vazia, ela vira o serviço (como um navegador)
    if (active.value && active.value.serviceId === null) {
      active.value.serviceId = serviceId
      return
    }
    const tab = { id: newId(), serviceId }
    tabs.value.push(tab)
    activate(tab.id)
  }

  function close(id: string) {
    const i = tabs.value.findIndex((t) => t.id === id)
    if (i < 0) return
    tabs.value.splice(i, 1)
    nav.value = nav.value.filter((x) => x !== id)

    if (tabs.value.length === 0) {
      const tab = { id: newId(), serviceId: null }
      tabs.value.push(tab)
      nav.value = [tab.id]
      navIndex.value = 0
      activeId.value = tab.id
      return
    }
    if (nav.value.length === 0) nav.value = [tabs.value[0].id]
    navIndex.value = Math.min(navIndex.value, nav.value.length - 1)
    if (activeId.value === id) {
      activeId.value = tabs.value[Math.max(0, i - 1)].id
      nav.value = [...nav.value.slice(0, navIndex.value + 1), activeId.value]
      navIndex.value = nav.value.length - 1
    }
  }

  function closeForService(serviceId: string) {
    tabs.value.filter((t) => t.serviceId === serviceId).forEach((t) => close(t.id))
  }

  const togglePanel = () => (panelOpen.value = !panelOpen.value)

  // Restaura as abas abertas da última sessão
  async function restore() {
    const saved = await getItem<{ serviceIds: (string | null)[]; active: number } | null>('tabs', null)
    if (saved?.serviceIds?.length) {
      const valid = saved.serviceIds.filter((id) => id === null || services.get(id))
      if (valid.length) {
        tabs.value = valid.map((serviceId) => ({ id: newId(), serviceId }))
        const idx = Math.min(saved.active ?? 0, tabs.value.length - 1)
        activeId.value = tabs.value[idx].id
        nav.value = [activeId.value]
        navIndex.value = 0
      }
    }
    watch(
      [tabs, activeId],
      () =>
        setItem('tabs', {
          serviceIds: tabs.value.map((t) => t.serviceId),
          active: Math.max(0, tabs.value.findIndex((t) => t.id === activeId.value)),
        }),
      { deep: true },
    )
  }

  return {
    tabs, activeId, active, activeService, panelOpen, canBack, canForward,
    activate, back, forward, openNewTab, openService, close, closeForService, togglePanel, restore,
  }
})
