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

const ui = useUi()
const services = useServices()
const tabs = useTabs()
const snaps = useSnapshots()

type Form = Omit<ServiceConfig, 'id'>
const blank = (): Form => ({
  type: 'jellyfin', name: '', baseUrl: '', token: '', username: '', password: '', slug: '', insecure: false,
})

const form = reactive<Form>(blank())
const nameTouched = ref(false)
const formError = ref('')
const testing = ref(false)
const testResult = ref<{ ok: boolean; text: string } | null>(null)
const nameInput = ref<HTMLInputElement>()
const reveal = ref(false)

const editing = computed(() => (ui.editingId ? services.get(ui.editingId) : undefined))
const meta = computed(() => META[form.type])

watch(
  () => ui.modalOpen,
  async (open) => {
    if (!open) return
    formError.value = ''
    testResult.value = null
    reveal.value = false
    Object.assign(form, editing.value ? { ...blank(), ...editing.value } : blank())
    nameTouched.value = !!editing.value
    if (!editing.value) form.name = META[form.type].label
    await nextTick()
    nameInput.value?.focus()
    nameInput.value?.select()
  },
)

function chooseType(t: ServiceType) {
  form.type = t
  testResult.value = null
  if (!nameTouched.value) form.name = META[t].label
}

function normalize(): Form {
  const name = form.name.trim()
  if (!name) throw new Error(t('modal.err.name'))
  let url = form.baseUrl.trim()
  if (!url) throw new Error(t('modal.err.url'))
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  try {
    new URL(url)
  } catch {
    throw new Error(t('modal.err.badUrl'))
  }
  const f = meta.value.fields
  const out: Form = { type: form.type, name, baseUrl: url.replace(/\/+$/, ''), insecure: form.insecure }
  if (f.includes('token')) {
    if (!form.token?.trim()) throw new Error(t('modal.err.required', { field: t(meta.value.tokenLabel ?? 'meta.jellyfin.tokenLabel') }))
    out.token = form.token.trim()
  }
  if (f.includes('username')) {
    if (!form.username?.trim() && !meta.value.authOptional)
      throw new Error(t('modal.err.required', { field: t('modal.user') }))
    out.username = form.username?.trim() || undefined
  }
  if (f.includes('password')) {
    if (!form.password && !meta.value.authOptional)
      throw new Error(t('modal.err.required', { field: t('modal.pass') }))
    out.password = form.password || undefined
  }
  if (f.includes('slug')) {
    // Aceita "server", "/status/server" ou a URL completa (inclusive /api/status-page/server)
    const raw = (form.slug ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
    const slug = raw.split('/').pop() ?? ''
    if (!slug) throw new Error(t('modal.err.required', { field: t('modal.slug') }))
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
    const snap = await createAdapter({ ...data, id: 'test' }).snapshot()
    testResult.value = { ok: true, text: t('modal.tested', { n: snap.stats.length }) }
  } catch (e) {
    testResult.value = { ok: false, text: (e as Error).message }
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
    ui.showToast(t('modal.saved'))
  } else {
    const created = services.add(data)
    tabs.openService(created.id)
    snaps.refresh(created.id)
    ui.showToast(t('modal.added', { name: created.name }))
  }
  ui.closeModal()
}

const field =
  'w-full rounded-2xl bg-surface-highest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary'
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.modalOpen"
        class="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4"
        @mousedown.self="ui.closeModal()"
        @keydown.esc="ui.closeModal()"
      >
        <form
          class="flex max-h-full w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-[28px] bg-surface-high p-6 text-on-surface shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          @submit.prevent="save"
        >
          <h2 id="modal-title" class="text-2xl font-semibold tracking-tight">
            {{ editing ? t('modal.titleEdit') : t('modal.titleAdd') }}
          </h2>

          <fieldset v-if="!editing" class="grid grid-cols-2 gap-2">
            <legend class="sr-only">{{ t('modal.type') }}</legend>
            <button
              v-for="t in SERVICE_TYPES"
              :key="t"
              type="button"
              :aria-pressed="form.type === t"
              class="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition active:scale-95"
              :class="form.type === t ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-highest text-on-surface-variant hover:bg-surface-container'"
              :style="form.type === t ? { boxShadow: `inset 0 0 0 2px ${META[t].color}` } : undefined"
              @click="chooseType(t)"
            >
              <span aria-hidden="true"
                class="material-symbols-rounded grid size-8 shrink-0 place-items-center rounded-full text-[18px]"
                :style="{ background: tintOn(META[t].color, 38, 'var(--md-surface)'), color: tintOn(META[t].color, 70, 'var(--md-on-surface)') }"
              >{{ META[t].icon }}</span>
              <span class="truncate">{{ META[t].label }}</span>
            </button>
          </fieldset>
          <p v-if="!editing" class="-mt-2 text-sm text-on-surface-variant">{{ t(meta.description) }}</p>

          <label class="flex flex-col gap-1.5 text-sm font-medium">
            {{ t('modal.name') }}
            <input
              ref="nameInput"
              v-model="form.name"
              :class="field"
              autocomplete="off"
              @input="nameTouched = true"
            />
          </label>

          <div class="flex flex-col gap-1.5 text-sm font-medium">
            <label for="field-address">{{ t('modal.address') }}</label>
            <span class="relative block">
              <input
                id="field-address"
                v-model="form.baseUrl"
                :class="[field, ui.hideAddresses && 'pr-12']"
                :type="ui.hideAddresses && !reveal ? 'password' : 'text'"
                :placeholder="meta.urlPlaceholder"
                inputmode="url"
                autocomplete="off"
                spellcheck="false"
              />
              <button
                v-if="ui.hideAddresses"
                type="button"
                class="material-symbols-rounded absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[20px] text-on-surface-variant transition hover:bg-surface-high"
                :aria-label="reveal ? t('modal.hideAddress') : t('modal.showAddress')"
                @click="reveal = !reveal"
              >{{ reveal ? 'visibility_off' : 'visibility' }}</button>
            </span>
          </div>

          <label v-if="meta.fields.includes('token')" class="flex flex-col gap-1.5 text-sm font-medium">
            {{ t(meta.tokenLabel ?? '') }}
            <input v-model="form.token" :class="field" type="password" autocomplete="off" />
            <span v-if="meta.tokenHint" class="text-xs font-normal text-on-surface-variant">{{ t(meta.tokenHint) }}</span>
          </label>

          <div v-if="meta.fields.includes('username')" class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1.5 text-sm font-medium">
              {{ t('modal.user') }}
              <input v-model="form.username" :class="field" autocomplete="off" />
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-medium">
              {{ t('modal.pass') }}
              <input v-model="form.password" :class="field" type="password" autocomplete="off" />
            </label>
          </div>

          <p v-if="meta.authOptional" class="-mt-3 text-xs text-on-surface-variant">{{ t('modal.authOptional') }}</p>

          <label v-if="meta.fields.includes('slug')" class="flex flex-col gap-1.5 text-sm font-medium">
            {{ t('modal.slug') }}
            <input v-model="form.slug" :class="field" placeholder="server" autocomplete="off" spellcheck="false" />
            <span class="text-xs font-normal text-on-surface-variant">{{ t(meta.slugHint ?? '') }}</span>
          </label>

          <label class="flex items-center gap-3 text-sm">
            <input v-model="form.insecure" type="checkbox" class="size-5 accent-primary" />
            {{ t('modal.insecure') }}
          </label>

          <p v-if="formError" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {{ formError }}
          </p>
          <p
            v-if="testResult"
            class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
            :class="testResult.ok ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'"
            role="status"
          >
            <span aria-hidden="true" class="material-symbols-rounded text-[20px]">{{ testResult.ok ? 'check_circle' : 'error' }}</span>
            {{ testResult.text }}
          </p>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              :disabled="testing"
              class="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10 active:scale-95 disabled:opacity-60"
              @click="test"
            >
              <span aria-hidden="true" class="material-symbols-rounded text-[20px]" :class="{ spin: testing }">{{ testing ? 'progress_activity' : 'network_check' }}</span>
              {{ t('modal.test') }}
            </button>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full px-5 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-highest active:scale-95"
                @click="ui.closeModal()"
              >{{ t('modal.cancel') }}</button>
              <button
                type="submit"
                class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:shadow-md active:scale-95"
              >{{ editing ? t('modal.save') : t('modal.add') }}</button>
            </div>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
