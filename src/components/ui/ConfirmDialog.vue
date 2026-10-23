
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
    dismissible?: boolean
  }>(),
  {
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    loading: false,
    dismissible: true,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const isOpen = computed(() => props.open)

function cancel() {
  if (props.loading) return

  emit('cancel')
  emit('update:open', false)
}

function confirm() {
  if (props.loading) return

  emit('confirm')
}
</script>

<template>
  <m3e-dialog
    :open="isOpen"
    :dismissible="dismissible && !loading"
    @cancel="cancel"
  >
    <div slot="header" class="text-lg font-semibold">
      {{ title }}
    </div>

    <div class="py-2 text-sm text-on-surface-variant">
      <slot>{{ message }}</slot>
    </div>

    <div slot="actions" class="flex justify-end gap-2">
      <m3e-button
        variant="text"
        :disabled="loading"
        @click="cancel"
      >
        {{ cancelText }}
      </m3e-button>

      <m3e-button
        :disabled="loading"
        @click="confirm"
      >
        {{ loading ? 'Aguarde…' : confirmText }}
      </m3e-button>
    </div>
  </m3e-dialog>
</template>
