<script setup lang="ts">
import type { VisualState } from '../lib/status'
defineProps<{ state: VisualState }>()
</script>

<template>
  <span
    class="inline-block size-2.5 shrink-0 rounded-full"
    :class="{
      'bg-ok': state === 'ok',
      'bg-warn': state === 'warn',
      'bg-bad': state === 'bad',
      'animate-pulse bg-on-surface-variant/50': state === 'loading',
    }"
  />
</template>
