
<script setup lang="ts">
type SkeletonShape = 'circular' | 'rounded' | 'square' | 'auto'
type SkeletonAnimation = 'pulse' | 'wave' | 'none'

withDefaults(
  defineProps<{
    shape?: SkeletonShape
    animation?: SkeletonAnimation
    loaded?: boolean
  }>(),
  {
    shape: 'rounded',
    animation: 'wave',
    loaded: false,
  },
)
</script>

<template>
  <m3e-skeleton
    :shape="shape"
    :animation="animation"
    :loaded="loaded"
    class="block"
  >
    <slot />
  </m3e-skeleton>
</template>
