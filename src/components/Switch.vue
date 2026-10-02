<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    class="relative h-8 w-14 shrink-0 rounded-full transition-colors"
    :class="modelValue ? 'bg-primary' : 'bg-surface-highest ring-2 ring-outline-variant ring-inset'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span aria-hidden="true"
      class="material-symbols-rounded absolute top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[16px] transition-all"
      :class="modelValue ? 'left-7 bg-on-primary text-primary' : 'left-1 bg-on-surface-variant text-transparent'"
    >check</span>
  </button>
</template>
