
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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

const { t } = useI18n()

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
    <m3e-loading-indicator
      v-if="loading"
      slot="icon"
      :aria-label="t('common.loading')"
      class="button-loading-indicator"
      style="
        --m3e-loading-indicator-active-indicator-color: currentColor;
        --m3e-loading-indicator-active-indicator-size: 18px;
        --m3e-loading-indicator-container-size: 24px;
      "
    />

    <span
      v-if="icon && !loading"
      slot="icon"
      aria-hidden="true"
      class="inline-flex"
    >
      <m3e-icon :name="icon" variant="rounded" />
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
