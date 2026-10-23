
<script setup lang="ts">
import { computed } from 'vue'
import type { Stat, Tone } from '../../services/types'

const props = defineProps<{ stat: Stat }>()

const TONES: Record<Tone, { container: string; foreground: string }> = {
  primary: {
    container: 'var(--md-primary-container)',
    foreground: 'var(--md-on-primary-container)',
  },
  secondary: {
    container: 'var(--md-secondary-container)',
    foreground: 'var(--md-on-secondary-container)',
  },
  tertiary: {
    container: 'var(--md-tertiary-container)',
    foreground: 'var(--md-on-tertiary-container)',
  },
  neutral: {
    container: 'var(--md-surface-high)',
    foreground: 'var(--md-on-surface)',
  },
}

const tone = computed(() => TONES[props.stat.tone ?? 'neutral'])

const cardStyle = computed<Record<string, string>>(() => ({
  '--m3e-filled-card-container-color': tone.value.container,
  '--m3e-filled-card-text-color': tone.value.foreground,
  '--m3e-card-shape': '1.5rem',
  '--m3e-card-padding': '1.25rem',
}))

const valueSize = computed(() =>
  props.stat.value.length > 9 ? 'text-2xl' : 'text-4xl',
)
</script>

<template>
  <m3e-card
    variant="filled"
    class="block min-h-36 transition-colors duration-500"
    :style="cardStyle"
  >
    <div
      slot="content"
      class="flex min-h-36 flex-col justify-between gap-4"
      :style="{ color: tone.foreground }"
    >
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium opacity-80">
          {{ stat.label }}
        </p>

        <span
          v-if="stat.icon"
          aria-hidden="true"
          class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
          style="background: color-mix(in oklab, currentColor 12%, transparent)"
        >
          {{ stat.icon }}
        </span>
      </div>

      <div class="min-w-0">
        <p
          class="truncate font-semibold tracking-tight"
          :class="valueSize"
        >
          {{ stat.value }}
        </p>

        <p
          v-if="stat.hint"
          class="mt-0.5 truncate text-xs opacity-70"
        >
          {{ stat.hint }}
        </p>
      </div>
    </div>
  </m3e-card>
</template>