
<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text'
type ButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  icon?: string
  trailingIcon?: string
  disabled?: boolean
  loading?: boolean
  danger?: boolean
}>(), {
  variant: 'tonal',
  size: 'small',
  type: 'button',
  disabled: false,
  loading: false,
  danger: false,
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const dangerStyle = computed<Record<string, string> | undefined>(() => {
  if (!props.danger) return undefined

  const prefix = `--m3e-${props.variant}-button-`
  const filled = props.variant === 'filled'

  return {
    [`${prefix}container-color`]: filled
      ? 'var(--md-bad)'
      : 'var(--md-error-container)',
    [`${prefix}label-text-color`]: filled
      ? '#ffffff'
      : 'var(--md-on-error-container)',
    [`${prefix}icon-color`]: filled
      ? '#ffffff'
      : 'var(--md-on-error-container)',
  }
})

function handleClick(event: Event) {
  emit('click', event)
}
</script>

<template>
  <m3e-button
    :variant="variant"
    :size="size"
    :type="type"
    :disabled="disabled || loading"
    :style="dangerStyle"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span
      v-if="icon || loading"
      slot="icon"
      aria-hidden="true"
      class="inline-flex"
      :class="{ spin: loading }"
    >
      <m3e-icon
        :name="loading ? 'progress_activity' : icon!"
        variant="rounded"
      />
    </span>

    <slot />

    <m3e-icon
      v-if="trailingIcon"
      slot="trailing-icon"
      :name="trailingIcon"
      variant="rounded"
    />
  </m3e-button>
</template>
