import {
  APP_DEFAULTS,
  type CardBackId,
  type DrawCount,
  type SolitaireDifficulty,
  type TableThemeId,
} from '../config/appDefaults'
import type { GoFishDifficulty, GoFishPlayerCount } from '../games/go-fish/types'
import type { MemoryGridSize, MemoryPlayerMode } from '../games/memory/types'
import type { GameId } from '../games/registry'
import type { TrashMatchMode, TrashPlayerCount } from '../games/trash/types'

export const ALL_GAME_IDS: readonly GameId[] = ['solitaire', 'memory-match', 'go-fish', 'trash']

export interface FeedbackReport {
  id: string
  category: 'bug' | 'idea'
  whatDoing?: string
  quickTags?: string[]
  message: string
  createdAt: string
  appVersion: string
  sentToWebhook: boolean
}

export interface ParentBackendConfig {
  githubRepo: string
  webhookUrl: string
}

export interface PlayerSettings {
  themeId: TableThemeId
  cardBackId: CardBackId
  soundEnabled: boolean
  largePrint: boolean
}

export interface SolitaireGameSettings {
  difficulty: SolitaireDifficulty
  drawCount: DrawCount
}

export interface MemoryGameSettings {
  gridSize: MemoryGridSize
  playerMode: MemoryPlayerMode
}

export interface GoFishGameSettings {
  playerCount: GoFishPlayerCount
  humanCount: 1 | 2
  difficulty: GoFishDifficulty
}

export interface TrashGameSettings {
  playerCount: TrashPlayerCount
  humanCount: 1 | 2
  matchMode: TrashMatchMode
}

export interface PerGameSettings {
  solitaire: SolitaireGameSettings
  'memory-match': MemoryGameSettings
  'go-fish': GoFishGameSettings
  trash: TrashGameSettings
}

export interface GameStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestMoves: number | null
  bestTimeSeconds: number | null
}

export type PerGameStats = Record<GameId, GameStats>

export interface PlayerProfile {
  settings: PlayerSettings
  gameSettings: PerGameSettings
  gameStats: PerGameStats
  parentReports: FeedbackReport[]
  parentConfig: ParentBackendConfig
}

const memoryFallback = new Map<string, string>()

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch {
    // Sandboxed iframe or private browsing
  }
  return memoryFallback.get(key) ?? null
}

export function safeSetItem(key: string, value: string): void {
  memoryFallback.set(key, value)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Sandboxed iframe or quota exceeded
  }
}

export function getDefaultGameStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestMoves: null,
    bestTimeSeconds: null,
  }
}

export function getDefaultPerGameStats(): PerGameStats {
  return {
    solitaire: getDefaultGameStats(),
    'memory-match': getDefaultGameStats(),
    'go-fish': getDefaultGameStats(),
    trash: getDefaultGameStats(),
  }
}

export function getDefaultPerGameSettings(): PerGameSettings {
  return {
    solitaire: {
      difficulty: APP_DEFAULTS.defaultDifficulty,
      drawCount: APP_DEFAULTS.defaultDrawCount,
    },
    'memory-match': {
      gridSize: '3x4',
      playerMode: 1,
    },
    'go-fish': {
      playerCount: 3,
      humanCount: 1,
      difficulty: 'gentle',
    },
    trash: {
      playerCount: 2,
      humanCount: 1,
      matchMode: 'quick',
    },
  }
}

export function getTotalWins(gameStats: PerGameStats): number {
  return ALL_GAME_IDS.reduce((sum, id) => sum + (gameStats[id]?.gamesWon ?? 0), 0)
}

export function getDefaultProfile(): PlayerProfile {
  return {
    settings: {
      themeId: APP_DEFAULTS.defaultThemeId,
      cardBackId: APP_DEFAULTS.defaultCardBackId,
      soundEnabled: APP_DEFAULTS.defaultSoundEnabled,
      largePrint: APP_DEFAULTS.defaultLargePrint,
    },
    gameSettings: getDefaultPerGameSettings(),
    gameStats: getDefaultPerGameStats(),
    parentReports: [],
    parentConfig: {
      githubRepo: APP_DEFAULTS.githubIssuesRepo,
      webhookUrl: APP_DEFAULTS.parentWebhookUrl,
    },
  }
}

interface LegacySettings extends Partial<PlayerSettings> {
  drawCount?: DrawCount
  difficulty?: SolitaireDifficulty
}

interface StoredProfileShape {
  settings?: LegacySettings
  gameSettings?: Partial<{
    solitaire: Partial<SolitaireGameSettings>
    'memory-match': Partial<MemoryGameSettings>
    'go-fish': Partial<GoFishGameSettings>
    trash: Partial<TrashGameSettings>
  }>
  gameStats?: Partial<Record<GameId, Partial<GameStats>>>
  parentReports?: FeedbackReport[]
  parentConfig?: Partial<ParentBackendConfig>
}

export function loadProfile(): PlayerProfile {
  const defaults = getDefaultProfile()
  const raw = safeGetItem(APP_DEFAULTS.storageKey)
  if (!raw) return defaults

  try {
    const parsed = JSON.parse(raw) as StoredProfileShape
    const rawSettings = parsed.settings ?? {}
    const rawGameSettings = parsed.gameSettings ?? {}
    const rawGameStats = parsed.gameStats ?? {}

    // Migrate legacy Solitaire settings that used to live inside global settings
    const legacySolitaireDifficulty = rawSettings.difficulty
    const legacySolitaireDrawCount = rawSettings.drawCount

    return {
      settings: {
        themeId: rawSettings.themeId ?? defaults.settings.themeId,
        cardBackId: rawSettings.cardBackId ?? defaults.settings.cardBackId,
        soundEnabled: rawSettings.soundEnabled ?? defaults.settings.soundEnabled,
        largePrint: rawSettings.largePrint ?? defaults.settings.largePrint,
      },
      gameSettings: {
        solitaire: {
          difficulty:
            rawGameSettings.solitaire?.difficulty ??
            legacySolitaireDifficulty ??
            defaults.gameSettings.solitaire.difficulty,
          drawCount:
            rawGameSettings.solitaire?.drawCount ??
            legacySolitaireDrawCount ??
            defaults.gameSettings.solitaire.drawCount,
        },
        'memory-match': {
          ...defaults.gameSettings['memory-match'],
          ...(rawGameSettings['memory-match'] ?? {}),
        },
        'go-fish': {
          ...defaults.gameSettings['go-fish'],
          ...(rawGameSettings['go-fish'] ?? {}),
        },
        trash: {
          ...defaults.gameSettings.trash,
          ...(rawGameSettings.trash ?? {}),
        },
      },
      gameStats: {
        solitaire: {
          ...defaults.gameStats.solitaire,
          ...(rawGameStats.solitaire ?? {}),
        },
        'memory-match': {
          ...defaults.gameStats['memory-match'],
          ...(rawGameStats['memory-match'] ?? {}),
        },
        'go-fish': {
          ...defaults.gameStats['go-fish'],
          ...(rawGameStats['go-fish'] ?? {}),
        },
        trash: {
          ...defaults.gameStats.trash,
          ...(rawGameStats.trash ?? {}),
        },
      },
      parentReports: Array.isArray(parsed.parentReports) ? parsed.parentReports : [],
      parentConfig: {
        ...defaults.parentConfig,
        ...(parsed.parentConfig ?? {}),
      },
    }
  } catch {
    return defaults
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    safeSetItem(APP_DEFAULTS.storageKey, JSON.stringify(profile))
  } catch {
    // Ignore serialization errors
  }
}
