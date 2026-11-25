import type { Card } from '../solitaire/types'

export type TrashPlayerCount = 2 | 3 | 4
export type TrashMatchMode = 'quick' | 'classic'

export interface TrashSlot {
  /** 1-based slot number (1 = Ace, 2..10) */
  slotNumber: number
  card: Card
  /** Whether this slot has been flipped face-up */
  revealed: boolean
}

export interface TrashPlayer {
  id: string
  name: string
  avatar: 'you' | 'bear' | 'fox' | 'owl'
  isHuman: boolean
  slots: TrashSlot[]
  roundsWon: number
}

export type TrashPhase =
  | 'human-draw'     // Human chooses Draw Pile or Discard Pile
  | 'human-place'    // Human holds activeCard and places it in a valid slot or discards it
  | 'bot-turn'       // Bot's turn
  | 'round-over'     // Someone filled all 10 slots (in classic 3-round mode)
  | 'game-over'      // Match complete

export interface TrashState {
  players: TrashPlayer[]
  stock: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  phase: TrashPhase
  playerCount: TrashPlayerCount
  matchMode: TrashMatchMode
  roundNumber: number
  targetRounds: number
  activeCard: Card | null
  statusMessage: string
  lastActionText: string | null
  turns: number
}
