<script setup lang="ts">
defineProps<{
  id: string
  title: string
  icon: string
}>()
</script>

<template>
  <section
    :id="id"
    :aria-labelledby="`${id}-title`"
    class="scroll-mt-24"
  >
    <m3e-card
      variant="filled"
      class="block transition-colors duration-500"
      style="
        --m3e-filled-card-container-color: var(--md-surface-container);
        --m3e-card-shape: 1.75rem;
        --m3e-card-padding: 0;
      "
    >
      <div slot="content" class="p-4 sm:p-6">
        <header class="mb-2 flex items-center gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-container text-primary"
            aria-hidden="true"
          >
            <m3e-icon :name="icon" variant="rounded" />
          </span>
          <h2 :id="`${id}-title`" class="text-lg font-semibold tracking-tight">
            {{ title }}
          </h2>
        </header>

        <slot />
      </div>
    </m3e-card>
  </section>
</template>
