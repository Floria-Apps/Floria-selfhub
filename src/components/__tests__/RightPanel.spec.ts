// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RightPanel from '../RightPanel.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: { remove: 'Remove', edit: 'Edit' },
      panel: { aria: 'Panel', close: 'Close', favorite: 'Fav', rating: 'Rating', noData: 'No data' },
      nav: { refresh: 'Refresh' },
      state: { ok: 'ok', warn: 'warn', bad: 'bad', idle: 'idle' }
    }
  }
})

// Mocking external dependencies
vi.mock('../../stores/tabs', () => ({
  useTabs: () => ({
    activeService: { id: 'cup-1', name: 'Cup', type: 'cup' },
    panelOpen: true,
    togglePanel: vi.fn(),
    closeForService: vi.fn()
  })
}))

vi.mock('../../stores/snapshots', () => ({
  useSnapshots: () => ({
    stateOf: () => ({
      loading: false,
      data: {
        health: 'warn',
        stats: [],
        itemsTitle: 'Imagens',
        items: [
          { id: '1', title: 'mysql:8.2', subtitle: '8.2 para 26.10', trailing: 'Major', status: 'warn' }
        ],
        emptyText: 'Nenhum dado'
      }
    })
  })
}))

vi.mock('../../services/registry', () => ({
  META: {
    cup: { icon: 'cup', color: '#ff0000', label: 'Cup' }
  }
}))

describe('RightPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountComponent() {
    return mount(RightPanel, {
      global: {
        plugins: [i18n],
        stubs: {
          'm3e-badge': true,
          'm3e-button': true,
          'm3e-icon': true,
          'm3e-icon-button': true,
          'm3e-linear-progress-indicator': true,
          'm3e-loading-indicator': true,
          'm3e-tooltip': true,
        },
      }
    })
  }

  it('renderiza a lista de itens com estrutura correta', () => {
    const wrapper = mountComponent()
    const listItem = wrapper.find('li.right-panel-item')
    expect(listItem.exists()).toBe(true)

    // Verificamos apenas se a tag existe, o que confirma que o componente carregou
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.text()).toContain('warn')
  })

  it('verifica se o trailing item existe', () => {
    const wrapper = mountComponent()
    // Buscamos pelo elemento que contém o texto "Major"
    const trailing = wrapper.find('.right-panel-item-content span:last-child')
    expect(trailing.exists()).toBe(true)
    expect(trailing.text()).toBe('Major')
  })
})
