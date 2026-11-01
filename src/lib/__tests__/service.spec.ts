import { describe, expect, it } from 'vitest'
import { normalizeSearchText, serviceDisplayName } from '../service'

describe('service labels and search', () => {
  it('uses the alias to distinguish service instances', () => {
    expect(serviceDisplayName({ name: 'Navidrome', alias: 'Debian' })).toBe('Navidrome - Debian')
    expect(serviceDisplayName({ name: 'Navidrome' })).toBe('Navidrome')
  })

  it('normalizes accents and letter case for search', () => {
    expect(normalizeSearchText('Mídia DEBIAN')).toBe('midia debian')
  })
})
