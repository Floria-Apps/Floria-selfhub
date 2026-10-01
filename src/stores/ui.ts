import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getItem, setItem } from '../lib/storage'

export type ThemeMode = 'auto' | 'light' | 'dark'

export const useUi = defineStore('ui', () => {
  const mode = ref<ThemeMode>('auto')
  const systemDark = ref(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const isDark = computed(() => (mode.value === 'auto' ? systemDark.value : mode.value === 'dark'))

  if (typeof matchMedia !== 'undefined') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemDark.value = e.matches
    })
  }

  async function load() {
    mode.value = await getItem<ThemeMode>('theme-mode', 'auto')
    watch(mode, (m) => setItem('theme-mode', m))
  }

  function cycleMode() {
    mode.value = mode.value === 'auto' ? 'light' : mode.value === 'light' ? 'dark' : 'auto'
  }

  // Modal de adicionar/editar serviço
  const modalOpen = ref(false)
  const editingId = ref<string | null>(null)
  const openModal = (serviceId: string | null = null) => {
    editingId.value = serviceId
    modalOpen.value = true
  }
  const closeModal = () => (modalOpen.value = false)

  // Snackbar
  const toast = ref<{ text: string; kind: 'ok' | 'error' } | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  function showToast(text: string, kind: 'ok' | 'error' = 'ok') {
    toast.value = { text, kind }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 4000)
  }

  return { mode, isDark, load, cycleMode, modalOpen, editingId, openModal, closeModal, toast, showToast }
})
