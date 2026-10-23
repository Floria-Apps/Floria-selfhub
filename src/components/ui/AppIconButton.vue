<script setup lang="ts">
import { toRef, useId } from 'vue'
import { useFullSpin } from '../../lib/useFullSpin'

defineOptions({ inheritAttrs: false })

type IconButtonVariant = 'standard' | 'outlined' | 'filled' | 'tonal'
type IconButtonSize =
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
type IconButtonShape = 'rounded' | 'square'
type IconButtonWidth = 'default' | 'narrow' | 'wide'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  shape?: IconButtonShape
  width?: IconButtonWidth
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  pressed?: boolean
  loading?: boolean
  draggable?: boolean
}>(), {
  variant: 'standard',
  size: 'small',
  shape: 'rounded',
  width: 'default',
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

// O ícone termina a volta atual mesmo se o loading terminar antes.
const { spinning, onIteration } = useFullSpin(toRef(props, 'loading'))

// Durante o loading, ignoramos cliques sem desabilitar o botão.
function onClick(event: Event) {
  if (props.loading) return
  emit('click', event)
}
</script>

<template>
  <m3e-icon-button
    v-bind="$attrs"
    :id="tooltipId"
    :variant="variant"
    :size="size"
    :shape="shape"
    :width="width"
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    :aria-pressed="pressed"
    :aria-busy="loading ? 'true' : undefined"
    :draggable="draggable"
    @click="onClick"
    @dragstart="emit('dragstart', $event)"
  >
    <span
      class="inline-flex"
      :class="{ 'animate-spin': spinning }"
      aria-hidden="true"
      @animationiteration="onIteration"
    >
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