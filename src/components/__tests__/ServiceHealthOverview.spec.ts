// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ServiceHealthOverview, { type ServiceHealthCounts } from '../ui/ServiceHealthOverview.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      home: { healthSummary: 'Service health summary' },
      state: { ok: 'Online', warn: 'Attention', bad: 'No response', loading: 'Checking' },
      settings: { monitoringPaused: 'Paused' },
    },
  },
})

const counts: ServiceHealthCounts = {
  ok: 3,
  warn: 1,
  bad: 2,
  loading: 4,
  paused: 1,
}

describe('ServiceHealthOverview.vue', () => {
  it('shows counts and emits a selected filter that can be cleared', async () => {
    const wrapper = mount(ServiceHealthOverview, {
      props: { counts, selected: 'all' },
      global: {
        plugins: [i18n],
        stubs: { 'm3e-badge': true },
      },
    })

    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Service health summary')
    expect(wrapper.text()).toContain('Online')
    expect(wrapper.text()).toContain('Checking')
    expect(wrapper.text()).toContain('Paused')
    expect(wrapper.text()).toContain('4')

    const attentionButton = wrapper.findAll('button').find((button) => button.text().includes('Attention'))
    expect(attentionButton).toBeDefined()
    await attentionButton?.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['warn']])

    await wrapper.setProps({ selected: 'warn' })
    await attentionButton?.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['warn'], ['all']])
  })
})
