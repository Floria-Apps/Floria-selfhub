<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { META, SERVICE_TYPES, createAdapter } from '../services/registry'
import type { ServiceConfig, ServiceType } from '../services/types'
import { useServices } from '../stores/services'
import { useSnapshots } from '../stores/snapshots'
import { useTabs } from '../stores/tabs'
import { useUi } from '../stores/ui'
import { tintOn } from '../lib/status'

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

const editing = computed(() => (ui.editingId ? services.get(ui.editingId) : undefined))
const meta = computed(() => META[form.type])

watch(
  () => ui.modalOpen,
  async (open) => {
    if (!open) return
    formError.value = ''
    testResult.value = null
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
  if (!name) throw new Error('Dê um nome ao serviço.')
  let url = form.baseUrl.trim()
  if (!url) throw new Error('Informe o endereço do serviço.')
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  try {
    new URL(url)
  } catch {
    throw new Error('O endereço não é válido. Exemplo: http://192.168.0.10:8096')
  }
  const f = meta.value.fields
  const out: Form = { type: form.type, name, baseUrl: url.replace(/\/+$/, ''), insecure: form.insecure }
  if (f.includes('token')) {
    if (!form.token?.trim()) throw new Error(`Informe ${meta.value.tokenLabel?.toLowerCase() ?? 'o token'}.`)
    out.token = form.token.trim()
  }
  if (f.includes('username')) {
    if (!form.username?.trim()) throw new Error('Informe o usuário.')
    out.username = form.username.trim()
  }
  if (f.includes('password')) {
    if (!form.password) throw new Error('Informe a senha.')
    out.password = form.password
  }
  if (f.includes('slug')) {
    if (!form.slug?.trim()) throw new Error('Informe o identificador da página de status.')
    out.slug = form.slug.trim()
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
    testResult.value = { ok: true, text: `Conectado. ${snap.stats.length} informações lidas.` }
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
    ui.showToast('Alterações salvas.')
  } else {
    const created = services.add(data)
    tabs.openService(created.id)
    snaps.refresh(created.id)
    ui.showToast(`${created.name} foi adicionado.`)
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
            {{ editing ? 'Editar serviço' : 'Adicionar serviço' }}
          </h2>

          <fieldset v-if="!editing" class="grid grid-cols-2 gap-2">
            <legend class="sr-only">Tipo de serviço</legend>
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
              <span
                class="material-symbols-rounded grid size-8 shrink-0 place-items-center rounded-full text-[18px]"
                :style="{ background: tintOn(META[t].color, 38, 'var(--md-surface)'), color: tintOn(META[t].color, 70, 'var(--md-on-surface)') }"
              >{{ META[t].icon }}</span>
              <span class="truncate">{{ META[t].label }}</span>
            </button>
          </fieldset>
          <p v-if="!editing" class="-mt-2 text-sm text-on-surface-variant">{{ meta.description }}</p>

          <label class="flex flex-col gap-1.5 text-sm font-medium">
            Nome
            <input
              ref="nameInput"
              v-model="form.name"
              :class="field"
              autocomplete="off"
              @input="nameTouched = true"
            />
          </label>

          <label class="flex flex-col gap-1.5 text-sm font-medium">
            Endereço
            <input
              v-model="form.baseUrl"
              :class="field"
              :placeholder="meta.urlPlaceholder"
              inputmode="url"
              autocomplete="off"
              spellcheck="false"
            />
          </label>

          <label v-if="meta.fields.includes('token')" class="flex flex-col gap-1.5 text-sm font-medium">
            {{ meta.tokenLabel }}
            <input v-model="form.token" :class="field" type="password" autocomplete="off" />
            <span v-if="meta.tokenHint" class="text-xs font-normal text-on-surface-variant">{{ meta.tokenHint }}</span>
          </label>

          <div v-if="meta.fields.includes('username')" class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1.5 text-sm font-medium">
              Usuário
              <input v-model="form.username" :class="field" autocomplete="off" />
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-medium">
              Senha
              <input v-model="form.password" :class="field" type="password" autocomplete="off" />
            </label>
          </div>

          <label v-if="meta.fields.includes('slug')" class="flex flex-col gap-1.5 text-sm font-medium">
            Página de status
            <input v-model="form.slug" :class="field" placeholder="meus-servicos" autocomplete="off" spellcheck="false" />
            <span class="text-xs font-normal text-on-surface-variant">{{ meta.slugHint }}</span>
          </label>

          <label class="flex items-center gap-3 text-sm">
            <input v-model="form.insecure" type="checkbox" class="size-5 accent-primary" />
            Aceitar certificado HTTPS autoassinado
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
            <span class="material-symbols-rounded text-[20px]">{{ testResult.ok ? 'check_circle' : 'error' }}</span>
            {{ testResult.text }}
          </p>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              :disabled="testing"
              class="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10 active:scale-95 disabled:opacity-60"
              @click="test"
            >
              <span class="material-symbols-rounded text-[20px]" :class="{ spin: testing }">{{ testing ? 'progress_activity' : 'network_check' }}</span>
              Testar conexão
            </button>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full px-5 py-2.5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-highest active:scale-95"
                @click="ui.closeModal()"
              >Cancelar</button>
              <button
                type="submit"
                class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:shadow-md active:scale-95"
              >{{ editing ? 'Salvar alterações' : 'Adicionar' }}</button>
            </div>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
