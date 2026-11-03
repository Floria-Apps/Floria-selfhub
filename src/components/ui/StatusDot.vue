
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { VisualState } from '../../lib/status'

withDefaults(defineProps<{
  state: VisualState
  decorative?: boolean
}>(), {
  decorative: false,
})

const { t } = useI18n()
</script>

<template>
  <m3e-badge
    size="small"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : t(`state.${state}`)"
    :aria-hidden="decorative ? 'true' : undefined"
    :class="`status-${state}`"
  />
</template>

<style scoped>
m3e-badge {
  display: inline-flex;
  width: 10px;
  height: 10px;
  min-width: 10px;
  border: none;
  outline: none;
  box-shadow: none;
  border-radius: 50%;
  overflow: hidden;

  --m3e-badge-shape: 50%;
  --m3e-badge-small-size: 10px;
  --m3e-badge-container-color: var(--md-on-surface-variant);
}

m3e-badge.status-ok {
  --m3e-badge-container-color: var(--md-ok);
}

m3e-badge.status-warn {
  --m3e-badge-container-color: var(--md-warn);
}

m3e-badge.status-bad {
  --m3e-badge-container-color: var(--md-bad);
}

m3e-badge.status-loading {
  animation: status-pulse 1.5s ease-in-out infinite;
}

@keyframes status-pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  m3e-badge.status-loading {
    animation: none;
  }
}
</style>
