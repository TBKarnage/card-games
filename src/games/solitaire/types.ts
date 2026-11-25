import type { DrawCount, SolitaireDifficulty } from '../../config/appDefaults'

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type PileLocation =
  | { zone: 'stock' }
  | { zone: 'waste' }
  | { zone: 'foundation'; index: number }
  | { zone: 'tableau'; index: number; cardIndex?: number }

export interface SolitaireState {
  stock: Card[]
  waste: Card[]
  foundations: [Card[], Card[], Card[], Card[]]
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]]
  drawCount: DrawCount
  difficulty: SolitaireDifficulty
  moves: number
  score: number
}

export interface MoveResult {
  nextState: SolitaireState
  moved: boolean
  flipped: boolean
  toFoundation: boolean
}

export interface MoveHint {
  from: PileLocation
  to: PileLocation
  label: string
}
