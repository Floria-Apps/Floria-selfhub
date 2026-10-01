import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  TonalPalette,
} from '@material/material-color-utilities'

export const DEFAULT_SEED = '#6750a4'

/**
 * Gera a paleta Material 3 a partir de uma cor-semente e aplica nas variáveis --md-*.
 * As superfícies usam um croma maior que o padrão do M3 para o app ficar mais colorido.
 */
export function applyTheme(seedHex: string, dark: boolean) {
  const theme = themeFromSourceColor(argbFromHex(seedHex))
  const s = dark ? theme.schemes.dark : theme.schemes.light
  const surfaces = TonalPalette.fromHueAndChroma(theme.palettes.primary.hue, 14)
  const tone = (t: number) => hexFromArgb(surfaces.tone(t))
  const h = hexFromArgb

  const vars: Record<string, string> = {
    primary: h(s.primary),
    'on-primary': h(s.onPrimary),
    'primary-container': h(s.primaryContainer),
    'on-primary-container': h(s.onPrimaryContainer),
    secondary: h(s.secondary),
    'secondary-container': h(s.secondaryContainer),
    'on-secondary-container': h(s.onSecondaryContainer),
    tertiary: h(s.tertiary),
    'tertiary-container': h(s.tertiaryContainer),
    'on-tertiary-container': h(s.onTertiaryContainer),
    'error-container': h(s.errorContainer),
    'on-error-container': h(s.onErrorContainer),
    surface: tone(dark ? 8 : 98),
    'surface-container': tone(dark ? 12 : 94),
    'surface-high': tone(dark ? 17 : 92),
    'surface-highest': tone(dark ? 22 : 89),
    'on-surface': h(s.onSurface),
    'on-surface-variant': h(s.onSurfaceVariant),
    'outline-variant': h(s.outlineVariant),
    'inverse-surface': h(s.inverseSurface),
    'inverse-on-surface': h(s.inverseOnSurface),
    ok: dark ? '#7ddc8f' : '#1f8a3b',
    warn: dark ? '#ffc85c' : '#b36b00',
    bad: dark ? '#ff8f8a' : '#c62828',
  }

  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(`--md-${k}`, v)
  root.style.colorScheme = dark ? 'dark' : 'light'
}
