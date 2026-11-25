import { describe, expect, it, vi } from 'vitest'
import { getDefaultProfile, loadProfile, safeGetItem, safeSetItem, saveProfile } from './storage'

describe('Safe Storage Utilities', () => {
  it('never throws if localStorage throws SecurityError', () => {
    const originalStorage = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => {
          throw new DOMException('Blocked', 'SecurityError')
        }),
        setItem: vi.fn(() => {
          throw new DOMException('Blocked', 'SecurityError')
        }),
      },
    })

    expect(() => safeSetItem('test-key', 'hello')).not.toThrow()
    expect(safeGetItem('test-key')).toBe('hello')
    expect(() => loadProfile()).not.toThrow()
    expect(() => saveProfile(getDefaultProfile())).not.toThrow()

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalStorage,
    })
  })
})
