<script setup lang="ts">
defineProps<{
  id: string
}>()
</script>

<template>
  <div class="inline-flex">
    <m3e-button variant="text">
      <m3e-menu-trigger :for="id">
        <slot name="trigger">Ações</slot>
      </m3e-menu-trigger>
    </m3e-button>

    <m3e-menu :id="id">
      <slot />
    </m3e-menu>
  </div>
</template>
