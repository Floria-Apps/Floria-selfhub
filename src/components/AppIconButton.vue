
<script setup lang="ts">
type IconButtonVariant = 'standard' | 'outlined' | 'filled' | 'tonal'
type IconButtonSize = 'extra-small' | 'small' | 'medium' | 'large'

withDefaults(defineProps<{
  icon: string
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  pressed?: boolean
  loading?: boolean
}>(), {
  variant: 'standard',
  size: 'small',
  type: 'button',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  click: [event: Event]
}>()
</script>

<template>
<m3e-icon-button
  :variant="variant"
  :size="size"
  :type="type"
  :disabled="disabled || loading"
  :aria-label="label"
  :aria-pressed="pressed"
  :aria-busy="loading ? 'true' : undefined"
  :title="label"
  @click="emit('click', $event)"
>
  <span
    class="inline-flex"
    :class="{ spin: loading }"
    aria-hidden="true"
  >
    <m3e-icon
      :name="loading ? 'progress_activity' : icon"
      variant="rounded"
    />
  </span>
</m3e-icon-button>
</template>
