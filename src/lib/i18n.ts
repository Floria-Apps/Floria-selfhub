import { computed } from 'vue'
import { createI18n } from 'vue-i18n'
import { isTauri } from '@tauri-apps/api/core'
import { locale as getOsLocale, platform } from '@tauri-apps/plugin-os'

export type Locale = string
export const isDesktop = isTauri() && !['android', 'ios'].includes(platform())

type Messages = Record<string, string>

const localeFiles = import.meta.glob<Messages>('../locales/*.json', {
  eager: true,
  import: 'default',
})

const messages = Object.fromEntries(
  Object.entries(localeFiles).map(([file, translations]) => {
    const name = file.match(/\/([^/]+)\.json$/)?.[1]
    if (!name) throw new Error(`Invalid locale filename: ${file}`)
    return [name, translations]
  }),
) as Record<string, Messages>

if (!messages.en) throw new Error('The English locale file is required as the fallback.')

export const LOCALES = Object.keys(messages).sort() as Locale[]
const FALLBACK_LOCALE: Locale = 'en'

export function localeName(language: Locale): string {
  return messages[language]?.['lang.name'] ?? language
}

function supportedLocale(language: string | null | undefined): Locale {
  const normalizedLanguage = language?.replace('_', '-').toLowerCase()
  if (!normalizedLanguage) return FALLBACK_LOCALE

  return (
    LOCALES.find((candidate) => candidate.toLowerCase() === normalizedLanguage) ??
    LOCALES.find((candidate) => candidate.split('-')[0].toLowerCase() === normalizedLanguage.split('-')[0]) ??
    FALLBACK_LOCALE
  )
}

let systemLocale = supportedLocale(typeof navigator === 'undefined' ? undefined : navigator.language)

export async function loadSystemLocale(): Promise<Locale> {
  const browserLanguage = typeof navigator === 'undefined' ? undefined : navigator.language
  const language = isTauri() ? await getOsLocale() : browserLanguage
  systemLocale = supportedLocale(language ?? browserLanguage)
  return systemLocale
}

export function getSystemLocale(): Locale {
  return systemLocale
}

export const i18n = createI18n({
  legacy: false,
  locale: systemLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages,
})

export const locale = computed<Locale>({
  get: () => i18n.global.locale.value as Locale,
  set: (value) => {
    i18n.global.locale.value = value
  },
})

/** Traduções usadas fora de componentes Vue, como nos adapters de serviço. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  return i18n.global.t(key, params)
}
