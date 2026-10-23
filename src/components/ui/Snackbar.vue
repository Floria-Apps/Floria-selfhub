<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUi } from '../../stores/ui'

const { t } = useI18n()
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
      closeLabel: t('snackbar.dismiss'),
    })
  },
)
</script>

<template>
  <!-- O m3e renderiza as notificações pelo serviço global. -->
  <span class="hidden" aria-hidden="true" />
</template>