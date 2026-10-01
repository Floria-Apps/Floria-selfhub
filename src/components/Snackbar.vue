<script setup lang="ts">
import { useUi } from '../stores/ui'
const ui = useUi()
</script>

<template>
  <Transition name="snack">
    <div
      v-if="ui.toast"
      class="fixed right-0 bottom-6 left-0 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-2xl bg-inverse-surface px-5 py-3.5 text-sm text-inverse-on-surface shadow-lg"
      role="status"
    >
      <span class="material-symbols-rounded text-[20px]">{{ ui.toast.kind === 'error' ? 'error' : 'check_circle' }}</span>
      {{ ui.toast.text }}
    </div>
  </Transition>
</template>
