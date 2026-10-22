
<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event) {
  const toggle = event.currentTarget as HTMLElement & {
    checked: boolean
  }

  emit('update:modelValue', toggle.checked)
}
</script>

<template>
  <m3e-switch
    :checked="modelValue"
    :aria-label="label"
    icons="selected"
    @change="handleChange"
  />
</template>