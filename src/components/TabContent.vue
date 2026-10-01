<script setup lang="ts">
import { useTabs } from '../stores/tabs'
import HomeView from './HomeView.vue'
import ServiceView from './ServiceView.vue'

const tabs = useTabs()
</script>

<template>
  <section
    class="min-h-0 flex-1 overflow-y-auto rounded-[28px] bg-surface p-8 transition-colors duration-500"
    role="tabpanel"
  >
    <ServiceView v-if="tabs.activeService" :key="tabs.activeService.id" :service="tabs.activeService" />
    <HomeView v-else />
  </section>
</template>
