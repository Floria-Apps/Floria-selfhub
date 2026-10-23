
<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()

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
  draggable?: boolean
}>(), {
  variant: 'standard',
  size: 'small',
  type: 'button',
  disabled: false,
  loading: false,
  draggable: false,
})

const emit = defineEmits<{
  click: [event: Event]
  dragstart: [event: DragEvent]
}>()

const tooltipId = useId()
</script>

<template>
<m3e-icon-button
  v-bind="$attrs"
  :id="tooltipId"
  :variant="variant"
  :size="size"
  :type="type"
  :disabled="disabled || loading"
  :aria-label="label"
  :aria-pressed="pressed"
  :aria-busy="loading ? 'true' : undefined"
  :draggable="draggable"
  @click="emit('click', $event)"
  @dragstart="emit('dragstart', $event)"
>
  <m3e-loading-indicator
    v-if="loading"
    :aria-label="t('common.loading')"
    class="button-loading-indicator"
    style="
      --m3e-loading-indicator-active-indicator-color: currentColor;
      --m3e-loading-indicator-active-indicator-size: 18px;
      --m3e-loading-indicator-container-size: 24px;
    "
  />
  <span v-else class="inline-flex" aria-hidden="true">
    <m3e-icon
      :name="icon"
      variant="rounded"
    />
  </span>
</m3e-icon-button>
<m3e-tooltip :for="tooltipId" position="below" show-delay="500">
  {{ label }}
</m3e-tooltip>
</template>
