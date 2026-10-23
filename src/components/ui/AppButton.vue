<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFullSpin } from '../../lib/useFullSpin'

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

// O ícone gira até completar a volta atual, mesmo que o loading termine antes.
const { spinning, onIteration } = useFullSpin(toRef(props, 'loading'))

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

// Durante o loading o botão NÃO é desabilitado (isso escurece o botão e tira o foco).
// O clique é apenas ignorado.
function handleClick(event: Event) {
  if (props.loading) return
  emit('click', event)
}
</script>

<template>
  <m3e-button
    :variant="variant"
    :size="size"
    :type="type"
    :disabled="disabled"
    :style="dangerStyle"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <!-- Com ícone: o próprio ícone gira durante o loading, então o botão não muda de tamanho. -->
    <span
      v-if="icon"
      slot="icon"
      aria-hidden="true"
      class="inline-flex"
      :class="{ 'animate-spin': spinning }"
      @animationiteration="onIteration"
    >
      <m3e-icon :name="icon" variant="rounded" />
    </span>

    <!-- Sem ícone: mantém o indicador original do m3e (aqui o botão cresce, não há o que girar). -->
    <m3e-loading-indicator
      v-else-if="loading"
      slot="icon"
      :aria-label="t('common.loading')"
      class="button-loading-indicator"
      style="
        --m3e-loading-indicator-active-indicator-color: currentColor;
        --m3e-loading-indicator-active-indicator-size: 18px;
        --m3e-loading-indicator-container-size: 24px;
      "
    />

    <slot />

    <m3e-icon
      v-if="trailingIcon"
      slot="trailing-icon"
      :name="trailingIcon"
      variant="rounded"
    />
  </m3e-button>
</template>