
<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { META, SERVICE_TYPES, createAdapter } from '../services/registry'
import type { ServiceConfig, ServiceType } from '../services/types'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { tintOn } from '../lib/status'
import { t } from '../lib/i18n'
import AppButton from './AppButton.vue'

const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

type Form = Omit<ServiceConfig, 'id'>

const blank = (): Form => ({
  type: 'jellyfin',
  name: '',
  baseUrl: '',
  token: '',
  username: '',
  password: '',
  slug: '',
  insecure: false,
})

const form = reactive<Form>(blank())
const nameTouched = ref(false)
const formError = ref('')
const testing = ref(false)
const testResult = ref<{ ok: boolean; text: string } | null>(null)
const nameInput = ref<HTMLInputElement>()
const reveal = ref(false)

const pendingToast = ref<{
  text: string
  kind: 'ok' | 'error'
} | null>(null)

const editing = computed(() =>
  ui.editingId ? services.get(ui.editingId) : undefined,
)

const meta = computed(() => META[form.type])

watch(
  () => ui.modalOpen,
  async (open) => {
    if (!open) return

    formError.value = ''
    testResult.value = null
    reveal.value = false

    Object.assign(
      form,
      editing.value ? { ...blank(), ...editing.value } : blank(),
    )

    nameTouched.value = !!editing.value

    if (!editing.value) {
      form.name = META[form.type].label
    }

    await nextTick()
    nameInput.value?.focus()
    nameInput.value?.select()
  },
  { flush: 'post' },
)

function chooseType(type: ServiceType) {
  form.type = type
  testResult.value = null

  if (!nameTouched.value) {
    form.name = META[type].label
  }
}

function handleInsecureChange(event: Event) {
  const checkbox = event.currentTarget as HTMLElement & {
    checked: boolean
  }

  form.insecure = checkbox.checked
}

function closeDialog() {
  ui.closeModal()
}

function handleDialogClosed() {
  if (ui.modalOpen) {
    ui.closeModal()
  }

  const notification = pendingToast.value

  if (!notification) return

  pendingToast.value = null

  ui.showToast(notification.text, notification.kind)
}

function normalize(): Form {
  const name = form.name.trim()

  if (!name) {
    throw new Error(t('modal.err.name'))
  }

  let url = form.baseUrl.trim()

  if (!url) {
    throw new Error(t('modal.err.url'))
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`
  }

  try {
    new URL(url)
  } catch {
    throw new Error(t('modal.err.badUrl'))
  }

  const fields = meta.value.fields

  const out: Form = {
    type: form.type,
    name,
    baseUrl: url.replace(/\/+$/, ''),
    insecure: form.insecure,
  }

  if (fields.includes('token')) {
    if (!form.token?.trim()) {
      throw new Error(
        t('modal.err.required', {
          field: t(
            meta.value.tokenLabel ?? 'meta.jellyfin.tokenLabel',
          ),
        }),
      )
    }

    out.token = form.token.trim()
  }

  if (fields.includes('username')) {
    if (!form.username?.trim() && !meta.value.authOptional) {
      throw new Error(
        t('modal.err.required', {
          field: t('modal.user'),
        }),
      )
    }

    out.username = form.username?.trim() || undefined
  }

  if (fields.includes('password')) {
    if (!form.password && !meta.value.authOptional) {
      throw new Error(
        t('modal.err.required', {
          field: t('modal.pass'),
        }),
      )
    }

    out.password = form.password || undefined
  }

  if (fields.includes('slug')) {
    // Aceita "server", "/status/server" ou uma URL completa.
    const raw = (form.slug ?? '')
      .trim()
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')

    const slug = raw.split('/').pop() ?? ''

    if (!slug) {
      throw new Error(
        t('modal.err.required', {
          field: t('modal.slug'),
        }),
      )
    }

    out.slug = slug
  }

  return out
}

async function test() {
  formError.value = ''
  testResult.value = null

  let data: Form

  try {
    data = normalize()
  } catch (e) {
    formError.value = (e as Error).message
    return
  }

  testing.value = true

  try {
    const snap = await createAdapter({
      ...data,
      id: 'test',
    }).snapshot()

    testResult.value = {
      ok: true,
      text: t('modal.tested', {
        n: snap.stats.length,
      }),
    }
  } catch (e) {
    testResult.value = {
      ok: false,
      text: (e as Error).message,
    }
  } finally {
    testing.value = false
  }
}

function save() {
  formError.value = ''

  let data: Form

  try {
    data = normalize()
  } catch (e) {
    formError.value = (e as Error).message
    return
  }

  if (editing.value) {
    services.update(editing.value.id, data)
    snaps.refresh(editing.value.id)

    pendingToast.value = {
      text: t('modal.saved'),
      kind: 'ok',
    }
  } else {
    const created = services.add(data)

    tabs.openService(created.id)
    snaps.refresh(created.id)

    pendingToast.value = {
      text: t('modal.added', {
        name: created.name,
      }),
      kind: 'ok',
    }
  }

  // A notificação só será mostrada após o evento @closed.
  ui.closeModal()
}
</script>

<template>
<m3e-dialog
    ref="dialogRef"
    :open="ui.modalOpen"
    dismissible
    :close-label="t('modal.cancel')"
    aria-labelledby="service-modal-title"
    style="
      --m3e-dialog-max-width: min(42rem, calc(100vw - 2rem));
      --m3e-dialog-max-height: calc(100dvh - 2rem);
      --m3e-dialog-container-color: var(--md-surface-high);
      --m3e-dialog-color: var(--md-on-surface);
    "
    @cancel="closeDialog"
    @closed="handleDialogClosed"
  >
    <h2
      id="service-modal-title"
      slot="header"
      class="text-xl font-semibold tracking-tight"
    >
      {{ editing ? t('modal.titleEdit') : t('modal.titleAdd') }}
    </h2>

    <form
      id="service-modal-form"
      class="flex max-h-[calc(100dvh-14rem)] w-full min-w-0 flex-col gap-4 overflow-y-auto px-1 py-1"
      novalidate
      @submit.prevent="save"
    >
      <!-- Tipo de serviço -->
      <fieldset
        v-if="!editing"
        class="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        <legend class="mb-2 text-sm font-medium">
          {{ t('modal.type') }}
        </legend>

        <m3e-button
          v-for="type in SERVICE_TYPES"
          :key="type"
          type="button"
          :variant="form.type === type ? 'tonal' : 'outlined'"
          :aria-pressed="form.type === type"
          class="w-full"
          @click="chooseType(type)"
        >
          <span
            slot="icon"
            aria-hidden="true"
            class="material-symbols-rounded grid size-8 shrink-0 place-items-center rounded-full text-[18px] leading-none"
            :style="{
              background: tintOn(
                META[type].color,
                38,
                'var(--md-surface)',
              ),
              color: tintOn(
                META[type].color,
                70,
                'var(--md-on-surface)',
              ),
            }"
          >{{ META[type].icon }}</span>

          <span class="truncate">
            {{ META[type].label }}
          </span>
        </m3e-button>
      </fieldset>

      <p
        v-if="!editing"
        class="-mt-1 text-sm text-on-surface-variant"
      >
        {{ t(meta.description) }}
      </p>

      <!-- Nome -->
      <m3e-form-field variant="outlined" class="w-full">
        <label slot="label" for="field-name">
          {{ t('modal.name') }}
        </label>

        <input
          id="field-name"
          ref="nameInput"
          v-model="form.name"
          class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
          autocomplete="off"
          @input="nameTouched = true"
        />
      </m3e-form-field>

      <!-- Endereço -->
      <m3e-form-field variant="outlined" class="w-full">
        <label slot="label" for="field-address">
          {{ t('modal.address') }}
        </label>

        <input
          id="field-address"
          v-model="form.baseUrl"
          class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
          :type="ui.hideAddresses && !reveal ? 'password' : 'text'"
          :placeholder="meta.urlPlaceholder"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
        />

        <m3e-icon-button
          v-if="ui.hideAddresses"
          slot="suffix"
          type="button"
          variant="standard"
          size="small"
          :aria-label="
            reveal
              ? t('modal.hideAddress')
              : t('modal.showAddress')
          "
          :title="
            reveal
              ? t('modal.hideAddress')
              : t('modal.showAddress')
          "
          @click="reveal = !reveal"
        >
          <span
            aria-hidden="true"
            class="material-symbols-rounded text-[20px] leading-none"
          >{{ reveal ? 'visibility_off' : 'visibility' }}</span>
        </m3e-icon-button>
      </m3e-form-field>

      <!-- Token -->
      <m3e-form-field
        v-if="meta.fields.includes('token')"
        variant="outlined"
        class="w-full"
      >
        <label slot="label" for="field-token">
          {{ t(meta.tokenLabel ?? '') }}
        </label>

        <input
          id="field-token"
          v-model="form.token"
          class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
          type="password"
          autocomplete="off"
        />

        <span v-if="meta.tokenHint" slot="hint">
          {{ t(meta.tokenHint) }}
        </span>
      </m3e-form-field>

      <!-- Usuário e senha -->
      <div
        v-if="meta.fields.includes('username')"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <m3e-form-field variant="outlined" class="w-full">
          <label slot="label" for="field-username">
            {{ t('modal.user') }}
          </label>

          <input
            id="field-username"
            v-model="form.username"
            class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
            autocomplete="off"
          />
        </m3e-form-field>

        <m3e-form-field variant="outlined" class="w-full">
          <label slot="label" for="field-password">
            {{ t('modal.pass') }}
          </label>

          <input
            id="field-password"
            v-model="form.password"
            class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
            type="password"
            autocomplete="off"
          />
        </m3e-form-field>
      </div>

      <p
        v-if="meta.authOptional"
        class="-mt-2 text-xs text-on-surface-variant"
      >
        {{ t('modal.authOptional') }}
      </p>

      <!-- Slug -->
      <m3e-form-field
        v-if="meta.fields.includes('slug')"
        variant="outlined"
        class="w-full"
      >
        <label slot="label" for="field-slug">
          {{ t('modal.slug') }}
        </label>

        <input
          id="field-slug"
          v-model="form.slug"
          class="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none"
          placeholder="server"
          autocomplete="off"
          spellcheck="false"
        />

        <span v-if="meta.slugHint" slot="hint">
          {{ t(meta.slugHint) }}
        </span>
      </m3e-form-field>

      <!-- Certificado HTTPS -->
      <label class="flex cursor-pointer items-center gap-3 text-sm">
        <m3e-checkbox
          :checked="form.insecure"
          @change="handleInsecureChange"
        />
        <span>{{ t('modal.insecure') }}</span>
      </label>

      <!-- Erro de validação -->
      <p
        v-if="formError"
        class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container"
        role="alert"
      >
        {{ formError }}
      </p>

      <!-- Resultado do teste -->
      <p
        v-if="testResult"
        class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
        :class="
          testResult.ok
            ? 'bg-primary-container text-on-primary-container'
            : 'bg-error-container text-on-error-container'
        "
        role="status"
      >
        <span
          aria-hidden="true"
          class="material-symbols-rounded text-[20px] leading-none"
        >{{ testResult.ok ? 'check_circle' : 'error' }}</span>

        {{ testResult.text }}
      </p>

      <!-- Permite submeter com Enter -->
      <button type="submit" tabindex="-1" aria-hidden="true" class="sr-only">
        {{ editing ? t('modal.save') : t('modal.add') }}
      </button>
    </form>

    <!-- Ações fixadas no rodapé do diálogo -->
    <div
      slot="actions"
      end
      class="flex w-full flex-wrap items-center justify-between gap-2"
    >
      <AppButton
        variant="text"
        icon="network_check"
        :loading="testing"
        @click="test"
      >
        {{ t('modal.test') }}
      </AppButton>

      <div class="flex flex-wrap justify-end gap-2">
        <AppButton
          variant="text"
          @click="closeDialog"
        >
          {{ t('modal.cancel') }}
        </AppButton>

        <AppButton
          variant="filled"
          :icon="editing ? 'save' : 'add'"
          @click="save"
        >
          {{ editing ? t('modal.save') : t('modal.add') }}
        </AppButton>
      </div>
    </div>
  </m3e-dialog>
</template>
