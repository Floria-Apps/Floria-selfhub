import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { locale } from '../../lib/i18n'
import { useUi } from '../ui'

vi.mock('@tauri-apps/plugin-autostart', () => ({
  disable: vi.fn(),
  enable: vi.fn(),
  isEnabled: vi.fn(async () => false),
}))

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted'),
}))

vi.mock('../../lib/storage', () => ({
  getItem: vi.fn(async (_key: string, fallback: unknown) => fallback),
  setItem: vi.fn(async () => undefined),
}))

describe('UI language preference', () => {
  const originalLocale = locale.value

  beforeEach(() => {
    setActivePinia(createPinia())
    locale.value = originalLocale
  })

  it('switches between automatic and explicitly selected languages', () => {
    const ui = useUi()
    ui.setLanguagePreference('pt-BR')

    expect(ui.languagePreference).toBe('pt-BR')
    expect(locale.value).toBe('pt-BR')
    expect(ui.prefs().locale).toBe('pt-BR')

    ui.setLanguagePreference('auto')
    expect(ui.languagePreference).toBe('auto')
    expect(ui.prefs().locale).toBe('auto')
  })

  it('restores automatic language from preferences', () => {
    const ui = useUi()
    ui.setLanguagePreference('pt-BR')
    ui.applyPrefs({ locale: 'auto' })

    expect(ui.languagePreference).toBe('auto')
    expect(ui.prefs().locale).toBe('auto')
  })

  it('persists the close-to-tray preference and restores its default when reset', () => {
    const ui = useUi()

    expect(ui.closeToTray).toBe(true)
    ui.applyPrefs({ closeToTray: false })
    expect(ui.closeToTray).toBe(false)
    expect(ui.prefs().closeToTray).toBe(false)

    ui.resetPrefs()
    expect(ui.closeToTray).toBe(true)
  })

  it('persists the tips preference and restores its default when reset', () => {
    const ui = useUi()

    expect(ui.showTips).toBe(true)
    ui.applyPrefs({ showTips: false })
    expect(ui.showTips).toBe(false)
    expect(ui.prefs().showTips).toBe(false)

    ui.resetPrefs()
    expect(ui.showTips).toBe(true)
  })

  it('applies, validates and resets M3E appearance preferences', () => {
    const ui = useUi()

    expect(ui.contrast).toBe('standard')
    expect(ui.themeVariant).toBe('tonal-spot')
    ui.applyPrefs({ contrast: 'high' })
    ui.applyPrefs({ themeVariant: 'expressive' })
    expect(ui.contrast).toBe('high')
    expect(ui.themeVariant).toBe('expressive')
    expect(ui.prefs().contrast).toBe('high')
    expect(ui.prefs().themeVariant).toBe('expressive')

    ui.applyPrefs({ contrast: 'invalid' })
    ui.applyPrefs({ themeVariant: 'invalid' })
    expect(ui.contrast).toBe('high')
    expect(ui.themeVariant).toBe('expressive')

    ui.resetPrefs()
    expect(ui.contrast).toBe('standard')
    expect(ui.themeVariant).toBe('tonal-spot')
  })
})
