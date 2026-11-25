import type { Card, Rank } from '../solitaire/types'

export type GoFishPlayerCount = 2 | 3 | 4
export type GoFishDifficulty = 'gentle' | 'clever'

export interface GoFishPlayer {
  id: string
  name: string
  avatar: 'you' | 'bear' | 'fox' | 'owl'
  isHuman: boolean
  hand: Card[]
  books: Rank[]
}

export type GoFishPhase =
  | 'human-pick'
  | 'human-go-fish'
  | 'human-handoff'
  | 'bot-turn'
  | 'game-over'

export interface GoFishMemoryHint {
  playerId: string
  rank: Rank
}

export interface GoFishState {
  players: GoFishPlayer[]
  pond: Card[]
  currentPlayerIndex: number
  phase: GoFishPhase
  playerCount: GoFishPlayerCount
  humanCount: 1 | 2
  difficulty: GoFishDifficulty
  /** Rank the current player just asked for (used to check for a lucky Go Fish catch) */
  pendingRank: Rank | null
  /** Target opponent id for the current ask */
  pendingTargetId: string | null
  /** Friendly status banner text */
  statusMessage: string
  /** Speech bubble keyed by player id */
  lastBubble: { playerId: string; text: string } | null
  /** Recent asks remembered by clever bots */
  recentAsks: GoFishMemoryHint[]
  turns: number
}
