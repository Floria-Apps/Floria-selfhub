import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import type { ThemeVariant } from '@m3e/web/theme'
import { getItem, setItem } from '../lib/storage'
import { getSystemLocale, isDesktop, LOCALES, loadSystemLocale, locale, t, type Locale } from '../lib/i18n'

const DEFAULT_SEED = '#6750a4'
export type ThemeMode = 'auto' | 'light' | 'dark'
export const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark']
export type ThemeContrast = 'standard' | 'medium' | 'high'
export const THEME_CONTRASTS: ThemeContrast[] = ['standard', 'medium', 'high']
export const THEME_VARIANTS: ThemeVariant[] = [
  'tonal-spot',
  'vibrant',
  'expressive',
  'content',
  'fidelity',
  'neutral',
  'monochrome',
  'rainbow',
  'fruit-salad',
]
export const THEME_SEEDS = [
  { name: 'teal', color: '#008577' },
  { name: 'blue', color: '#3f6ad8' },
  { name: 'purple', color: '#6750a4' },
  { name: 'pink', color: '#c33f79' },
  { name: 'orange', color: '#d96a16' },
  { name: 'green', color: '#4c8b24' },
] as const
/** Segundos entre atualizações automáticas (0 = só manual) */
export const REFRESH_OPTIONS = [0, 15, 30, 60, 300]
export type LocalePreference = 'auto' | Locale

export interface Prefs {
  mode: ThemeMode
  contrast: ThemeContrast
  themeVariant: ThemeVariant
  locale: LocalePreference
  dynamicColor: boolean
  seedColor: string
  refreshSeconds: number
  hideAddresses: boolean
  notificationsEnabled: boolean
}

export const useUi = defineStore('ui', () => {
  const mode = ref<ThemeMode>('auto')
  const contrast = ref<ThemeContrast>('standard')
  const themeVariant = ref<ThemeVariant>('tonal-spot')
  const languagePreference = ref<LocalePreference>('auto')
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
    contrast: contrast.value,
    themeVariant: themeVariant.value,
    locale: languagePreference.value,
    dynamicColor: dynamicColor.value,
    seedColor: seedColor.value,
    refreshSeconds: refreshSeconds.value,
    hideAddresses: hideAddresses.value,
    notificationsEnabled: notificationsEnabled.value,
  })

  function setLanguagePreference(preference: LocalePreference) {
    if (preference !== 'auto' && !LOCALES.includes(preference)) return

    languagePreference.value = preference
    locale.value = preference === 'auto' ? getSystemLocale() : preference
  }

  /** Aplica preferências vindas do disco ou de um arquivo importado, ignorando valores inválidos */
  function applyPrefs(raw: unknown) {
    if (!raw || typeof raw !== 'object') return
    const p = raw as Record<string, unknown>
    if (THEME_MODES.includes(p.mode as ThemeMode)) mode.value = p.mode as ThemeMode
    if (THEME_CONTRASTS.includes(p.contrast as ThemeContrast))
      contrast.value = p.contrast as ThemeContrast
    if (THEME_VARIANTS.includes(p.themeVariant as ThemeVariant))
      themeVariant.value = p.themeVariant as ThemeVariant
    if (p.locale === 'auto') setLanguagePreference('auto')
    else if (typeof p.locale === 'string' && LOCALES.includes(p.locale)) {
      setLanguagePreference(p.locale)
    }
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
      [mode, contrast, themeVariant, locale, dynamicColor, seedColor, refreshSeconds, hideAddresses, notificationsEnabled],
      () => setItem('prefs', prefs()),
    )
    watch(
      languagePreference,
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
    applyPrefs({ mode: 'auto', contrast: 'standard', themeVariant: 'tonal-spot', locale: 'auto', dynamicColor: true, seedColor: DEFAULT_SEED, refreshSeconds: 30, hideAddresses: false })
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
    mode, contrast, themeVariant, languagePreference, dynamicColor, seedColor, refreshSeconds, hideAddresses, notificationsEnabled, startOnLogin, isDark, omniboxTick, focusOmnibox,
    prefs, applyPrefs, load, resetPrefs,
    setLanguagePreference,
    setNotificationsEnabled, setStartOnLogin,
    modalOpen, editingId, openModal, closeModal, toast, showToast,
  }
})
