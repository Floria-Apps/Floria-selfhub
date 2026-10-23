
<script setup lang="ts">
import { computed, ref } from 'vue'

export interface FilterChipOption {
  label: string
  value: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: FilterChipOption[]
    modelValue: string | string[] | null
    multi?: boolean
    ariaLabel?: string
  }>(),
  {
    multi: false,
    ariaLabel: 'Filtrar itens',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
  change: [value: string | string[] | null]
}>()

const chipSet = ref<HTMLElement | null>(null)

const selectedValues = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  return props.modelValue === null ? [] : [props.modelValue]
})


function handleChange() {
  const element = chipSet.value as
    | (HTMLElement & {
        value?: string | readonly string[] | null
      })
    | null

  if (!element) return

  const rawValue = element.value

  const value: string | string[] | null =
    rawValue == null
      ? null
      : typeof rawValue === 'string'
        ? rawValue
        : [...rawValue]

  emit('update:modelValue', value)
  emit('change', value)
}

</script>

<template>
  <m3e-filter-chip-set
    ref="chipSet"
    :multi="multi"
    :aria-label="ariaLabel"
    @change="handleChange"
  >
    <m3e-filter-chip
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :selected="selectedValues.includes(option.value)"
      :disabled="option.disabled ?? false"
    >
      {{ option.label }}
    </m3e-filter-chip>
  </m3e-filter-chip-set>
</template>
