export type MemoryGridSize = '3x4' | '4x4' | '4x5'

export type MemoryPlayerMode = 1 | 2 | 'bot'

export type MemorySymbolId =
  | 'teacup'
  | 'acorn'
  | 'fox'
  | 'owl'
  | 'lantern'
  | 'yarn'
  | 'pie'
  | 'leaf'
  | 'star'
  | 'mitten'

export interface MemoryCard {
  id: string
  symbolId: MemorySymbolId
  label: string
  accentColor: string
  faceUp: boolean
  matched: boolean
}

export interface MemoryGameState {
  cards: MemoryCard[]
  gridSize: MemoryGridSize
  playerMode: MemoryPlayerMode
  currentPlayer: 1 | 2
  scores: [number, number]
  flippedIds: string[]
  moves: number
  isResolvingMismatch: boolean
}
