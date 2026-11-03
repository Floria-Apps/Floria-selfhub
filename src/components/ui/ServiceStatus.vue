<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { VisualState } from '../../lib/status'
import StatusDot from './StatusDot.vue'

withDefaults(defineProps<{
  state: VisualState
  paused?: boolean
  showLabel?: boolean
}>(), {
  paused: false,
  showLabel: true,
})

const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <template v-if="paused">
      <span
        aria-hidden="true"
        class="material-symbols-rounded text-base text-on-surface-variant"
      >pause_circle</span>
      <span>{{ t('settings.monitoringPaused') }}</span>
    </template>
    <template v-else>
      <StatusDot :state="state" :decorative="showLabel" />
      <span v-if="showLabel">{{ t(`state.${state}`) }}</span>
    </template>
  </span>
</template>
