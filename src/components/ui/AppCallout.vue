<script setup lang="ts">
type CalloutVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface'

withDefaults(
  defineProps<{
    variant?: CalloutVariant
    icon?: string
    label?: string
  }>(),
  {
    variant: 'secondary',
  },
)
</script>

<template>
  <m3e-callout :variant="variant" class="block">
    <m3e-icon
      v-if="icon"
      slot="icon"
      :name="icon"
      variant="rounded"
    />

    <span v-if="label" slot="label">{{ label }}</span>
    <slot />
  </m3e-callout>
</template>
