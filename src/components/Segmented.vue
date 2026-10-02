<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T; label: string; icon?: string }[]
  modelValue: T
  label: string
}>()
defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="inline-flex flex-wrap rounded-full bg-surface-high p-1">
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      :aria-checked="modelValue === o.value"
      class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95"
      :class="modelValue === o.value
        ? 'bg-secondary-container text-on-secondary-container shadow-sm'
        : 'text-on-surface-variant hover:bg-surface-highest'"
      @click="$emit('update:modelValue', o.value)"
    >
      <span aria-hidden="true" v-if="o.icon" class="material-symbols-rounded text-[18px]">{{ o.icon }}</span>
      {{ o.label }}
    </button>
  </div>
</template>
