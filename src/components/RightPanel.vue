
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { t } from '../lib/i18n'
import AppButton from './AppButton.vue'
import AppIconButton from './AppIconButton.vue'

const tabs = useTabs()
const services = useServices()
const snaps = useSnapshots()
const ui = useUi()

const service = computed(() => tabs.activeService)
const state = computed(() => snaps.stateOf(service.value?.id))
const data = computed(() => state.value?.data)

const stars = [1, 2, 3, 4, 5]

const confirming = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function resetConfirmation() {
  confirming.value = false
  clearTimeout(confirmTimer)
  confirmTimer = undefined
}

watch(
  () => service.value?.id,
  () => resetConfirmation(),
)

onUnmounted(() => {
  clearTimeout(confirmTimer)
})

function remove() {
  const s = service.value
  if (!s) return

  if (!confirming.value) {
    confirming.value = true
    clearTimeout(confirmTimer)

    confirmTimer = setTimeout(() => {
      confirming.value = false
      confirmTimer = undefined
    }, 4000)

    return
  }

  clearTimeout(confirmTimer)
  confirmTimer = undefined

  tabs.closeForService(s.id)
  services.remove(s.id)
  ui.showToast(t('panel.removed', { name: s.name }))
  confirming.value = false
}

const dot = (status?: string) =>
  ({
    up: 'bg-ok',
    down: 'bg-bad',
    warn: 'bg-warn',
    idle: 'bg-on-surface-variant/50',
  })[status ?? 'idle']
</script>

<template>
  <Transition name="panel">
    <aside
      v-if="tabs.panelOpen && service"
      class="w-80 shrink-0"
      :aria-label="t('panel.aria')"
    >
      <div
        class="flex h-full w-80 flex-col gap-4 rounded-[28px] bg-tertiary-container p-5 text-on-tertiary-container transition-colors duration-500"
      >
        <!-- Cabeçalho -->
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-semibold">
              {{ data?.itemsTitle ?? t('panel.title') }}
            </h2>

            <p class="truncate text-sm opacity-75">
              {{ service.name }}
            </p>
          </div>

          <AppIconButton
            icon="close"
            :label="t('panel.close')"
            @click="tabs.togglePanel()"
          />
        </div>

        <!-- Lista de itens do serviço -->
        <div
          class="-mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2"
        >
          <template v-if="data">
            <!-- Estado vazio -->
            <p
              v-if="!data.items.length"
              class="rounded-2xl bg-surface/60 p-4 text-sm"
            >
              {{ data.emptyText }}
            </p>

            <!-- Itens do serviço -->
            <div
              v-for="item in data.items"
              :key="item.id"
              class="rounded-2xl bg-surface/70 p-3 text-on-surface"
            >
              <div class="flex items-start gap-3">
                <!-- Capa do álbum -->
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="`Capa: ${item.title}`"
                  loading="lazy"
                  class="size-14 shrink-0 rounded-xl bg-surface-high object-cover"
                />

                <!-- Indicador de status para itens sem capa -->
                <span
                  v-else
                  class="mt-1.5 size-2.5 shrink-0 rounded-full"
                  :class="dot(item.status)"
                />

                <div class="min-w-0 flex-1">
                  <!-- Título e favorito -->
                  <div class="flex items-start gap-1.5">
                    <p
                      class="min-w-0 flex-1 wrap-break-word text-sm leading-snug font-medium"
                    >
                      {{ item.title }}
                    </p>

                    <span
                      v-if="item.favorite !== undefined"
                      class="material-symbols-rounded shrink-0 text-lg leading-none"
                      :class="
                        item.favorite
                          ? 'text-pink-500'
                          : 'text-on-surface-variant/40'
                      "
                      :title="
                        item.favorite ? 'Favorita' : 'Não favorita'
                      "
                      :aria-label="
                        item.favorite ? 'Favorita' : 'Não favorita'
                      "
                    >{{ item.favorite ? 'favorite' : 'favorite_border' }}</span>
                  </div>

                  <!-- Artista e álbum -->
                  <p
                    v-if="item.subtitle"
                    class="mt-0.5 wrap-break-word text-xs text-on-surface-variant"
                  >
                    {{ item.subtitle }}
                  </p>

                  <!-- Usuário ou informação adicional -->
                  <p
                    v-if="item.trailing"
                    class="mt-1 truncate text-xs text-on-surface-variant"
                  >
                    {{ item.trailing }}
                  </p>

                  <!-- Avaliação: cinco estrelas preenchidas ou vazias -->
                  <div
                    v-if="item.rating != null"
                    class="mt-1 flex items-center gap-0.5"
                    :aria-label="`Avaliação: ${item.rating} de 5`"
                    :title="`Avaliação: ${item.rating} de 5`"
                  >
                    <span
                      v-for="star in stars"
                      :key="star"
                      aria-hidden="true"
                      class="material-symbols-rounded text-base leading-none"
                      :class="
                        star <= item.rating
                          ? 'text-amber-500'
                          : 'text-on-surface-variant/35'
                      "
                    >{{ star <= item.rating ? 'star' : 'star_outline' }}</span>
                  </div>

                  <!-- Progresso, quando fornecido pelo adapter -->
                  <div
                    v-if="item.progress != null"
                    class="mt-2 h-1.5 overflow-hidden rounded-full bg-on-surface/10"
                  >
                    <div
                      class="h-full rounded-full bg-primary"
                      :style="{
                        width: `${Math.min(100, item.progress * 100)}%`,
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Erro ao carregar dados -->
          <p
            v-else-if="state?.error"
            class="rounded-2xl bg-surface/60 p-4 text-sm"
          >
            {{ t('panel.noData') }}
          </p>

          <!-- Carregamento -->
          <template v-else>
            <div
              v-for="n in 3"
              :key="n"
              class="h-16 animate-pulse rounded-2xl bg-surface/50"
            />
          </template>
        </div>

        <!-- Ações do serviço -->
        <div class="flex gap-2">
          <AppButton
            class="min-w-0 flex-1"
            variant="tonal"
            icon="edit"
            @click="ui.openModal(service.id)"
          >
            {{ t('common.edit') }}
          </AppButton>

          <AppButton
            class="min-w-0 flex-1"
            :variant="confirming ? 'filled' : 'tonal'"
            :danger="confirming"
            icon="delete"
            @click="remove"
          >
            {{
              confirming
                ? t('common.confirm')
                : t('common.remove')
            }}
          </AppButton>
        </div>
      </div>
    </aside>
  </Transition>
</template>
