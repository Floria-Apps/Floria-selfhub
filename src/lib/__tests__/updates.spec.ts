import { describe, expect, it } from 'vitest'
import { isNewerVersion } from '../updates'

describe('isNewerVersion', () => {
  it('detects newer patch, minor, and major releases', () => {
    expect(isNewerVersion('1.4.2', '1.4.1')).toBe(true)
    expect(isNewerVersion('1.5.0', '1.4.9')).toBe(true)
    expect(isNewerVersion('2.0.0', '1.99.99')).toBe(true)
  })

  it('does not treat the current or an older release as an update', () => {
    expect(isNewerVersion('1.4.1', '1.4.1')).toBe(false)
    expect(isNewerVersion('1.3.9', '1.4.1')).toBe(false)
  })

  it('handles v-prefixed releases and prerelease tags', () => {
    expect(isNewerVersion('v1.4.1', '1.4.0')).toBe(true)
    expect(isNewerVersion('1.4.1', '1.4.1-rc.1')).toBe(true)
    expect(isNewerVersion('1.4.1-rc.2', '1.4.1-rc.1')).toBe(true)
    expect(isNewerVersion('1.4.1-rc.1', '1.4.1-rc.beta')).toBe(false)
    expect(isNewerVersion('1.4.1-rc.beta', '1.4.1-rc.1')).toBe(true)
    expect(isNewerVersion('1.4.1-rc.1', '1.4.1')).toBe(false)
  })

  it('ignores malformed versions', () => {
    expect(isNewerVersion('latest', '1.4.1')).toBe(false)
    expect(isNewerVersion('1.4', '1.4.1')).toBe(false)
  })
})
