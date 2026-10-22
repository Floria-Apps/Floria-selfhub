<script setup lang="ts">
import { watch } from 'vue'
import { locale } from '../lib/i18n'
import { useUi } from '../stores/ui'

const ui = useUi()

interface SnackbarOptions {
  duration?: number
  closeLabel?: string
}

interface M3eSnackbarService {
  open(
    message: string,
    dismissibleOrAction?: boolean | string,
    options?: SnackbarOptions,
  ): void
}

const snackbar = (
  globalThis as typeof globalThis & {
    M3eSnackbar?: M3eSnackbarService
  }
).M3eSnackbar

watch(
  () => ui.toast,
  (toast) => {
    if (!toast || !snackbar) return

    snackbar.open(toast.text, true, {
      duration: 4000,
      closeLabel:
        locale.value === 'pt-BR'
          ? 'Fechar notificação'
          : 'Dismiss notification',
    })
  },
)
</script>

<template>
  <!-- O m3e renderiza as notificações pelo serviço global. -->
  <span class="hidden" aria-hidden="true" />
</template>