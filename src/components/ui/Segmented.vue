
<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T; label: string; icon?: string }[]
  modelValue: T
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

function handleChange(event: Event, value: T) {
  const segment = event.currentTarget as HTMLElement & {
    checked: boolean
  }

  // Só atualiza quando o segmento fica selecionado.
  if (segment.checked) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <m3e-segmented-button
    :aria-label="label"
    class="inline-flex flex-wrap"
  >
    <m3e-button-segment
      v-for="o in options"
      :key="String(o.value)"
      :value="String(o.value)"
      :checked="modelValue === o.value"
      @change="handleChange($event, o.value)"
    >
      <m3e-icon
        v-if="o.icon"
        slot="icon"
        :name="o.icon"
        variant="rounded"
      />
      {{ o.label }}
    </m3e-button-segment>
  </m3e-segmented-button>
</template>
