import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { getItem, setItem } from '../lib/storage'
import { getSystemLocale, isDesktop, LOCALES, loadSystemLocale, locale, t, type Locale } from '../lib/i18n'

const DEFAULT_SEED = '#6750a4'
export type ThemeMode = 'auto' | 'light' | 'dark'
export const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark']
/** Segundos entre atualizações automáticas (0 = só manual) */
export const REFRESH_OPTIONS = [0, 15, 30, 60, 300]

export interface Prefs {
  mode: ThemeMode
  locale: Locale
  dynamicColor: boolean
  seedColor: string
  refreshSeconds: number
  hideAddresses: boolean
  notificationsEnabled: boolean
}

export const useUi = defineStore('ui', () => {
  const mode = ref<ThemeMode>('auto')
  const dynamicColor = ref(true)
  const seedColor = ref(DEFAULT_SEED)
  const refreshSeconds = ref(30)
  const hideAddresses = ref(false)
  const notificationsEnabled = ref(false)
  const startOnLogin = ref(false)

  const systemDark = ref(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const isDark = computed(() => (mode.value === 'auto' ? systemDark.value : mode.value === 'dark'))

  if (typeof matchMedia !== 'undefined') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemDark.value = e.matches
    })
  }

  const prefs = (): Prefs => ({
    mode: mode.value,
    locale: locale.value,
    dynamicColor: dynamicColor.value,
    seedColor: seedColor.value,
    refreshSeconds: refreshSeconds.value,
    hideAddresses: hideAddresses.value,
    notificationsEnabled: notificationsEnabled.value,
  })

  /** Aplica preferências vindas do disco ou de um arquivo importado, ignorando valores inválidos */
  function applyPrefs(raw: unknown) {
    if (!raw || typeof raw !== 'object') return
    const p = raw as Record<string, unknown>
    if (THEME_MODES.includes(p.mode as ThemeMode)) mode.value = p.mode as ThemeMode
    if (LOCALES.includes(p.locale as Locale)) locale.value = p.locale as Locale
    if (typeof p.dynamicColor === 'boolean') dynamicColor.value = p.dynamicColor
    if (typeof p.seedColor === 'string' && /^#[0-9a-f]{6}$/i.test(p.seedColor))
      seedColor.value = p.seedColor.toLowerCase()
    if (REFRESH_OPTIONS.includes(p.refreshSeconds as number)) refreshSeconds.value = p.refreshSeconds as number
    if (typeof p.hideAddresses === 'boolean') hideAddresses.value = p.hideAddresses
    if (typeof p.notificationsEnabled === 'boolean') notificationsEnabled.value = p.notificationsEnabled
  }

  async function setNotificationsEnabled(enabled: boolean) {
    if (!isDesktop) return

    if (enabled) {
      try {
        const granted = await isPermissionGranted() || await requestPermission() === 'granted'
        if (!granted) {
          showToast(t('settings.notificationsPermissionDenied'), 'error')
          return
        }
      } catch (error) {
        console.error('Falha ao solicitar permissão para notificações', error)
        showToast(t('settings.systemIntegrationError'), 'error')
        return
      }
    }

    notificationsEnabled.value = enabled
  }

  async function setStartOnLogin(enabled: boolean) {
    if (!isDesktop) return

    try {
      if (enabled) await enable()
      else await disable()
      startOnLogin.value = enabled
    } catch (error) {
      console.error('Falha ao alterar a inicialização com o sistema', error)
      showToast(t('settings.systemIntegrationError'), 'error')
    }
  }

  async function load() {
    locale.value = await loadSystemLocale()
    // Chaves da versão anterior (tema e idioma salvos separados)
    applyPrefs({
      mode: await getItem<unknown>('theme-mode', undefined),
      locale: await getItem<unknown>('locale', undefined),
    })
    applyPrefs(await getItem<unknown>('prefs', {}))
    watch(
      [mode, locale, dynamicColor, seedColor, refreshSeconds, hideAddresses, notificationsEnabled],
      () => setItem('prefs', prefs()),
    )
    if (isDesktop) {
      try {
        startOnLogin.value = await isEnabled()
        if (notificationsEnabled.value && !(await isPermissionGranted())) {
          notificationsEnabled.value = false
          showToast(t('settings.notificationsPermissionDenied'), 'error')
        }
      } catch (error) {
        console.error('Falha ao carregar as integrações do sistema', error)
        showToast(t('settings.systemIntegrationError'), 'error')
      }
    }
  }

  function resetPrefs() {
    applyPrefs({ mode: 'auto', locale: getSystemLocale(), dynamicColor: true, seedColor: DEFAULT_SEED, refreshSeconds: 30, hideAddresses: false })
    notificationsEnabled.value = false
  }

  // Pede para a barra de pesquisa receber o foco (Ctrl/Cmd + L)
  const omniboxTick = ref(0)
  const focusOmnibox = () => omniboxTick.value++

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

  return {
    mode, dynamicColor, seedColor, refreshSeconds, hideAddresses, notificationsEnabled, startOnLogin, isDark, omniboxTick, focusOmnibox,
    prefs, applyPrefs, load, resetPrefs,
    setNotificationsEnabled, setStartOnLogin,
    modalOpen, editingId, openModal, closeModal, toast, showToast,
  }
})
