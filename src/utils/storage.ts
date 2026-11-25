import {
  APP_DEFAULTS,
  type CardBackId,
  type DrawCount,
  type SolitaireDifficulty,
  type TableThemeId,
} from '../config/appDefaults'

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
  drawCount: DrawCount
  difficulty: SolitaireDifficulty
}

export interface PlayerStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestMoves: number | null
  bestTimeSeconds: number | null
}

export interface PlayerProfile {
  settings: PlayerSettings
  stats: PlayerStats
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

export function getDefaultProfile(): PlayerProfile {
  return {
    settings: {
      themeId: APP_DEFAULTS.defaultThemeId,
      cardBackId: APP_DEFAULTS.defaultCardBackId,
      soundEnabled: APP_DEFAULTS.defaultSoundEnabled,
      largePrint: APP_DEFAULTS.defaultLargePrint,
      drawCount: APP_DEFAULTS.defaultDrawCount,
      difficulty: APP_DEFAULTS.defaultDifficulty,
    },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestMoves: null,
      bestTimeSeconds: null,
    },
    parentReports: [],
    parentConfig: {
      githubRepo: APP_DEFAULTS.githubIssuesRepo,
      webhookUrl: APP_DEFAULTS.parentWebhookUrl,
    },
  }
}

export function loadProfile(): PlayerProfile {
  const defaults = getDefaultProfile()
  const raw = safeGetItem(APP_DEFAULTS.storageKey)
  if (!raw) return defaults

  try {
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    return {
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
      },
      stats: {
        ...defaults.stats,
        ...(parsed.stats ?? {}),
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
