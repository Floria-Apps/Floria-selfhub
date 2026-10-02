import type { SnapshotState } from '../stores/snapshots'
import { t } from './i18n'

export type VisualState = 'loading' | 'ok' | 'warn' | 'bad'

export function visualState(s?: SnapshotState): VisualState {
  if (!s) return 'loading'
  if (s.error) return 'bad'
  if (s.data) return s.data.health
  return 'loading'
}

export const stateLabel = (s: VisualState) => t(`state.${s}`)

/** Mistura a cor do serviço com transparente */
export const tint = (color: string, pct: number) =>
  `color-mix(in oklab, ${color} ${pct}%, transparent)`

/** Mistura a cor do serviço com uma cor base do tema */
export const tintOn = (color: string, pct: number, base: string) =>
  `color-mix(in oklab, ${color} ${pct}%, ${base})`
