<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { visualState } from '../lib/status'
import { META } from '../services/registry'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import AppButton from './ui/AppButton.vue'
import AppIconButton from './ui/AppIconButton.vue'
import StatusDot from './ui/StatusDot.vue'

const tabs = useTabs()
const { t } = useI18n()
const services = useServices()
const snaps = useSnapshots()
const ui = useUi()

const service = computed(() => tabs.activeService)
const state = computed(() => snaps.stateOf(service.value?.id))
const data = computed(() => state.value?.data)
const health = computed(() => visualState(state.value))
const serviceMeta = computed(() => service.value && META[service.value.type])

function itemStatusClass(status?: string) {
  return {
    'bg-ok': status === 'up',
    'bg-bad': status === 'down',
    'bg-warn': status === 'warn',
    'bg-on-surface-variant/50': !status || status === 'idle',
  }
}

const confirming = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function resetConfirmation() {
  confirming.value = false
  clearTimeout(confirmTimer)
  confirmTimer = undefined
}

watch(() => service.value?.id, resetConfirmation)

onUnmounted(() => clearTimeout(confirmTimer))

function remove() {
  const currentService = service.value
  if (!currentService) return

  if (!confirming.value) {
    confirming.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(resetConfirmation, 4000)
    return
  }

  resetConfirmation()
  tabs.closeForService(currentService.id)
  services.remove(currentService.id)
  ui.showToast(t('panel.removed', { name: currentService.name }))
}

function refresh() {
  if (service.value) void snaps.refresh(service.value.id)
}
</script>

<template>
  <Transition name="fade">
    <aside
      v-if="tabs.panelOpen && service"
      class="right-panel-container flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] bg-tertiary-container text-on-tertiary-container transition-colors duration-500"
      :aria-label="t('panel.aria')"
    >
      <header class="flex items-center gap-3 border-b border-on-tertiary-container/10 px-4 py-3">
        <span
          class="material-symbols-rounded grid size-10 shrink-0 place-items-center rounded-full bg-surface-container text-xl"
          aria-hidden="true"
        >
          {{ serviceMeta?.icon }}
        </span>

        <div class="min-w-0 flex-1">
          <h2 class="truncate font-semibold">
            {{ service.name }}
          </h2>
          <div class="flex items-center gap-1.5 text-sm opacity-75">
            <StatusDot :state="health" />
            <span>{{ t(`state.${health}`) }}</span>
          </div>
        </div>

        <AppIconButton
          icon="refresh"
          :label="t('nav.refresh')"
          :loading="state?.loading ?? true"
          @click="refresh"
        />
        <AppIconButton
          icon="close"
          :label="t('panel.close')"
          @click="tabs.togglePanel()"
        />
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p
          v-if="state?.error && data"
          class="mb-3 rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container"
          role="status"
        >
          {{ t('sv.stale') }}
        </p>

        <template v-if="data">
          <h3 class="mb-2 text-sm font-medium text-on-surface-variant">
            {{ data.itemsTitle }}
          </h3>

          <p
            v-if="!data.items.length"
            class="rounded-xl bg-surface-container px-3 py-4 text-sm text-on-surface-variant"
          >
            {{ data.emptyText }}
          </p>

          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="item in data.items"
              :key="item.id"
              class="right-panel-item flex min-w-0 items-center gap-3 rounded-xl bg-surface/70 p-3 text-on-surface"
            >
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="`Capa: ${item.title}`"
                loading="lazy"
                class="right-panel-cover size-11 shrink-0 rounded-lg bg-surface-container object-cover"
              />
              <span
                v-else
                aria-hidden="true"
                class="size-2.5 shrink-0 rounded-full"
                :class="itemStatusClass(item.status)"
              />

              <div class="right-panel-item-content flex min-w-0 flex-1 items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium" :title="item.title">
                    {{ item.title }}
                  </p>
                  <p
                    v-if="item.subtitle"
                    class="truncate text-xs text-on-surface-variant"
                    :title="item.subtitle"
                  >
                    {{ item.subtitle }}
                  </p>
                  <m3e-linear-progress-indicator
                    v-if="item.progress != null"
                    class="mt-1 block"
                    :value="Math.max(0, Math.min(100, item.progress * 100))"
                    max="100"
                    :aria-label="t('jf.progress', { value: Math.round(Math.max(0, Math.min(1, item.progress)) * 100) })"
                    style="
                      --m3e-linear-progress-indicator-thickness: 4px;
                      --m3e-linear-progress-indicator-shape: 999px;
                    "
                  />
                </div>

                <span
                  v-if="item.favorite"
                  class="material-symbols-rounded shrink-0 text-base text-on-surface-variant"
                  :aria-label="t('panel.favorite')"
                >favorite</span>
                <span
                  v-if="item.rating != null"
                  class="shrink-0 text-xs text-on-surface-variant"
                  :aria-label="t('panel.rating', { rating: item.rating })"
                >
                  {{ item.rating }}/5
                </span>
                <span
                  v-if="item.trailing"
                  class="max-w-24 shrink-0 truncate text-xs text-on-surface-variant"
                  :title="item.trailing"
                >
                  {{ item.trailing }}
                </span>
              </div>
            </li>
          </ul>
        </template>

        <p
          v-else-if="state?.error"
          class="rounded-xl bg-surface-container px-3 py-4 text-sm text-on-surface-variant"
          role="alert"
        >
          {{ t('panel.noData') }}
        </p>

        <div v-else class="flex flex-col gap-3" :aria-label="t('common.loading')">
          <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-surface-container" />
        </div>
      </div>

      <footer class="flex gap-2 border-t border-on-tertiary-container/10 p-3">
        <AppButton
          class="min-w-0 flex-1"
          icon="edit"
          @click="ui.openModal(service.id)"
        >
          {{ t('common.edit') }}
        </AppButton>
        <AppButton
          class="min-w-0 flex-1"
          :variant="confirming ? 'filled' : 'outlined'"
          :danger="confirming"
          icon="delete"
          @click="remove"
        >
          {{ confirming ? t('common.confirm') : t('common.remove') }}
        </AppButton>
      </footer>
    </aside>
  </Transition>
</template>
