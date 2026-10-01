<script setup lang="ts">
import { computed } from 'vue'
import type { Stat, Tone } from '../services/types'

const props = defineProps<{ stat: Stat }>()

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  neutral: 'bg-surface-high text-on-surface',
}
const tone = computed(() => TONES[props.stat.tone ?? 'neutral'])
const valueSize = computed(() => (props.stat.value.length > 9 ? 'text-2xl' : 'text-4xl'))
</script>

<template>
  <div class="flex min-h-36 flex-col justify-between gap-4 rounded-3xl p-5 transition-colors duration-500" :class="tone">
    <div class="flex items-start justify-between gap-2">
      <p class="text-sm font-medium opacity-80">{{ stat.label }}</p>
      <span
        v-if="stat.icon"
        class="material-symbols-rounded grid size-9 shrink-0 place-items-center rounded-full text-[20px]"
        style="background: color-mix(in oklab, currentColor 12%, transparent)"
      >{{ stat.icon }}</span>
    </div>
    <div class="min-w-0">
      <p class="truncate font-semibold tracking-tight" :class="valueSize">{{ stat.value }}</p>
      <p v-if="stat.hint" class="mt-0.5 truncate text-xs opacity-70">{{ stat.hint }}</p>
    </div>
  </div>
</template>
