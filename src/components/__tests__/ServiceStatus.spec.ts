// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ServiceStatus from '../ui/ServiceStatus.vue'

const messages = {
  en: {
    state: { ok: 'Online', warn: 'Attention', bad: 'Offline', loading: 'Checking' },
    settings: { monitoringPaused: 'Monitoring paused' },
  },
  'pt-BR': {
    state: { ok: 'No ar', warn: 'Atenção', bad: 'Sem resposta', loading: 'Verificando' },
    settings: { monitoringPaused: 'Monitoramento pausado' },
  },
}

function mountStatus(locale: 'en' | 'pt-BR', props: { state: 'ok' | 'warn' | 'bad' | 'loading'; paused?: boolean; showLabel?: boolean }) {
  return mount(ServiceStatus, {
    props,
    global: {
      plugins: [createI18n({ legacy: false, locale, messages })],
      stubs: { 'm3e-badge': true },
    },
  })
}

describe('ServiceStatus.vue', () => {
  it('localizes the accessible label when only the status dot is shown', () => {
    const english = mountStatus('en', { state: 'warn', showLabel: false })
    const portuguese = mountStatus('pt-BR', { state: 'warn', showLabel: false })

    expect(english.get('m3e-badge-stub').attributes('aria-label')).toBe('Attention')
    expect(portuguese.get('m3e-badge-stub').attributes('aria-label')).toBe('Atenção')
  })

  it('shows a visible label and hides the redundant dot from assistive technology', () => {
    const wrapper = mountStatus('en', { state: 'ok' })

    expect(wrapper.text()).toContain('Online')
    expect(wrapper.get('m3e-badge-stub').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('m3e-badge-stub').attributes('aria-label')).toBeUndefined()
  })

  it('shows the paused state instead of a health dot', () => {
    const wrapper = mountStatus('pt-BR', { state: 'ok', paused: true })

    expect(wrapper.text()).toContain('Monitoramento pausado')
    expect(wrapper.find('m3e-badge-stub').exists()).toBe(false)
  })
})
