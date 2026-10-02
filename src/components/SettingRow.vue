<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
    <div class="min-w-0 flex-1 basis-64">
      <p class="font-medium">{{ title }}</p>
      <p v-if="description" class="mt-0.5 text-sm text-on-surface-variant">{{ description }}</p>
    </div>
    <div class="flex max-w-full items-center gap-2"><slot /></div>
  </div>
</template>
