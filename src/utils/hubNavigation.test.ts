import { afterEach, describe, expect, it, vi } from 'vitest'
import { HUB_URL, navigateToGamesHub } from './hubNavigation'

describe('navigateToGamesHub', () => {
  const originalLocation = window.location
  const originalReferrer = Object.getOwnPropertyDescriptor(document, 'referrer')
  const originalHistoryLength = Object.getOwnPropertyDescriptor(window.history, 'length')
  const originalStartViewTransition = Object.getOwnPropertyDescriptor(
    document,
    'startViewTransition'
  )

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    if (originalReferrer) {
      Object.defineProperty(document, 'referrer', originalReferrer)
    }
    if (originalHistoryLength) {
      Object.defineProperty(window.history, 'length', originalHistoryLength)
    }
    if (originalStartViewTransition) {
      Object.defineProperty(document, 'startViewTransition', originalStartViewTransition)
    } else {
      Reflect.deleteProperty(document, 'startViewTransition')
    }
    vi.restoreAllMocks()
  })

  it('uses history.back() wrapped in startViewTransition when on games.burks.pro from /', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'games.burks.pro', assign: vi.fn() },
    })
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://games.burks.pro/',
    })
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 2,
    })

    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const transitionSpy = vi.fn((cb: () => void) => {
      cb()
      return {} as ViewTransition
    })
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: transitionSpy,
    })

    navigateToGamesHub()

    expect(transitionSpy).toHaveBeenCalledTimes(1)
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to direct history.back() when startViewTransition is unavailable', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'games.burks.pro', assign: vi.fn() },
    })
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://games.burks.pro/',
    })
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 2,
    })

    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    navigateToGamesHub()

    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it('navigates in-place to / when opened directly on games.burks.pro (e.g. PWA shortcut)', () => {
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'games.burks.pro', assign: assignSpy },
    })
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: '',
    })

    navigateToGamesHub()

    expect(assignSpy).toHaveBeenCalledWith('/')
  })

  it('navigates in-place to https://games.burks.pro/ when running elsewhere', () => {
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'localhost', assign: assignSpy },
    })

    navigateToGamesHub()

    expect(assignSpy).toHaveBeenCalledWith(HUB_URL)
  })
})
