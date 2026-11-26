import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_DEFAULTS } from '../config/appDefaults'
import {
  ALL_GAME_IDS,
  getDefaultProfile,
  getTotalWins,
  loadProfile,
  safeGetItem,
  safeSetItem,
  saveProfile,
} from './storage'

describe('Safe Storage Utilities', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

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

  it('tracks wins, streaks, and best scores individually per game', () => {
    const profile = getDefaultProfile()
    for (const id of ALL_GAME_IDS) {
      expect(profile.gameStats[id]).toEqual({
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        bestMoves: null,
        bestTimeSeconds: null,
      })
    }

    profile.gameStats.solitaire = {
      gamesPlayed: 3,
      gamesWon: 2,
      currentStreak: 2,
      bestMoves: 84,
      bestTimeSeconds: 210,
    }
    profile.gameStats['go-fish'] = {
      gamesPlayed: 2,
      gamesWon: 1,
      currentStreak: 1,
      bestMoves: 14,
      bestTimeSeconds: 95,
    }

    saveProfile(profile)
    const loaded = loadProfile()

    expect(loaded.gameStats.solitaire.gamesWon).toBe(2)
    expect(loaded.gameStats.solitaire.bestMoves).toBe(84)
    expect(loaded.gameStats['go-fish'].gamesWon).toBe(1)
    expect(loaded.gameStats['go-fish'].bestMoves).toBe(14)
    expect(loaded.gameStats['memory-match'].gamesWon).toBe(0)
    expect(loaded.gameStats.trash.gamesWon).toBe(0)
    expect(getTotalWins(loaded.gameStats)).toBe(3)
  })

  it('persists per-game settings independently and migrates legacy Solitaire settings', () => {
    window.localStorage.setItem(
      APP_DEFAULTS.storageKey,
      JSON.stringify({
        settings: {
          soundEnabled: false,
          largePrint: true,
          difficulty: 'hard',
          drawCount: 3,
        },
      })
    )

    const migrated = loadProfile()
    expect(migrated.settings).toEqual({
      themeId: APP_DEFAULTS.defaultThemeId,
      cardBackId: APP_DEFAULTS.defaultCardBackId,
      soundEnabled: false,
      largePrint: true,
    })
    expect(migrated.gameSettings.solitaire).toEqual({
      difficulty: 'hard',
      drawCount: 3,
    })

    migrated.gameSettings['memory-match'] = { gridSize: '4x5', playerMode: 'bot' }
    migrated.gameSettings['go-fish'] = { playerCount: 4, humanCount: 1, difficulty: 'clever' }
    migrated.gameSettings.trash = { playerCount: 2, humanCount: 2, matchMode: 'classic' }
    saveProfile(migrated)

    const reloaded = loadProfile()
    expect(reloaded.gameSettings['memory-match']).toEqual({ gridSize: '4x5', playerMode: 'bot' })
    expect(reloaded.gameSettings['go-fish']).toEqual({
      playerCount: 4,
      humanCount: 1,
      difficulty: 'clever',
    })
    expect(reloaded.gameSettings.trash).toEqual({
      playerCount: 2,
      humanCount: 2,
      matchMode: 'classic',
    })
  })
})
