import type {
  MemoryCard,
  MemoryGameState,
  MemoryGridSize,
  MemoryPlayerMode,
  MemorySymbolId,
} from './types'

export interface MemorySymbolDef {
  id: MemorySymbolId
  label: string
  accentColor: string
}

export const MEMORY_SYMBOLS: MemorySymbolDef[] = [
  { id: 'teacup', label: 'Teacup', accentColor: '#c94a38' },
  { id: 'acorn', label: 'Acorn', accentColor: '#9b622b' },
  { id: 'fox', label: 'Fox', accentColor: '#d4682a' },
  { id: 'owl', label: 'Owl', accentColor: '#5c527f' },
  { id: 'lantern', label: 'Lantern', accentColor: '#c78b20' },
  { id: 'yarn', label: 'Yarn', accentColor: '#b84b68' },
  { id: 'pie', label: 'Pie', accentColor: '#b3622d' },
  { id: 'leaf', label: 'Leaf', accentColor: '#3c6e4e' },
  { id: 'star', label: 'Star', accentColor: '#3a5a8c' },
  { id: 'mitten', label: 'Mitten', accentColor: '#2d767f' },
]

export const MEMORY_GRID_OPTIONS: {
  id: MemoryGridSize
  label: string
  pairs: number
}[] = [
  { id: '3x4', label: 'Cozy (3×4)', pairs: 6 },
  { id: '4x4', label: 'Classic (4×4)', pairs: 8 },
  { id: '4x5', label: 'Grand (4×5)', pairs: 10 },
]

export function getPairCount(gridSize: MemoryGridSize): number {
  switch (gridSize) {
    case '3x4':
      return 6
    case '4x4':
      return 8
    case '4x5':
      return 10
  }
}

export function shuffleCards<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function createMemoryGame(
  gridSize: MemoryGridSize = '3x4',
  playerMode: MemoryPlayerMode = 1,
  rng: () => number = Math.random
): MemoryGameState {
  const pairCount = getPairCount(gridSize)
  const chosenSymbols = shuffleCards(MEMORY_SYMBOLS, rng).slice(0, pairCount)

  const deck: MemoryCard[] = []
  for (const sym of chosenSymbols) {
    deck.push({
      id: `${sym.id}-a`,
      symbolId: sym.id,
      label: sym.label,
      accentColor: sym.accentColor,
      faceUp: false,
      matched: false,
    })
    deck.push({
      id: `${sym.id}-b`,
      symbolId: sym.id,
      label: sym.label,
      accentColor: sym.accentColor,
      faceUp: false,
      matched: false,
    })
  }

  return {
    cards: shuffleCards(deck, rng),
    gridSize,
    playerMode,
    currentPlayer: 1,
    scores: [0, 0],
    flippedIds: [],
    moves: 0,
    isResolvingMismatch: false,
  }
}

export interface FlipResult {
  nextState: MemoryGameState
  outcome: 'ignored' | 'first-flip' | 'match' | 'mismatch'
}

export function flipMemoryCard(state: MemoryGameState, cardId: string): FlipResult {
  if (state.isResolvingMismatch || state.flippedIds.length >= 2) {
    return { nextState: state, outcome: 'ignored' }
  }

  const target = state.cards.find((c) => c.id === cardId)
  if (!target || target.faceUp || target.matched) {
    return { nextState: state, outcome: 'ignored' }
  }

  const updatedCards = state.cards.map((c) =>
    c.id === cardId ? { ...c, faceUp: true } : c
  )
  const nextFlipped = [...state.flippedIds, cardId]

  if (nextFlipped.length === 1) {
    return {
      nextState: {
        ...state,
        cards: updatedCards,
        flippedIds: nextFlipped,
      },
      outcome: 'first-flip',
    }
  }

  const firstCard = updatedCards.find((c) => c.id === nextFlipped[0])
  const secondCard = updatedCards.find((c) => c.id === nextFlipped[1])

  if (firstCard && secondCard && firstCard.symbolId === secondCard.symbolId) {
    const matchedCards = updatedCards.map((c) =>
      c.id === firstCard.id || c.id === secondCard.id ? { ...c, matched: true } : c
    )
    const nextScores: [number, number] = [...state.scores]
    nextScores[state.currentPlayer - 1] += 1

    return {
      nextState: {
        ...state,
        cards: matchedCards,
        scores: nextScores,
        flippedIds: [],
        moves: state.moves + 1,
        isResolvingMismatch: false,
      },
      outcome: 'match',
    }
  }

  return {
    nextState: {
      ...state,
      cards: updatedCards,
      flippedIds: nextFlipped,
      moves: state.moves + 1,
      isResolvingMismatch: true,
    },
    outcome: 'mismatch',
  }
}

export function resolveMismatch(state: MemoryGameState): MemoryGameState {
  if (!state.isResolvingMismatch) return state

  const flippedSet = new Set(state.flippedIds)
  const nextCards = state.cards.map((c) =>
    flippedSet.has(c.id) && !c.matched ? { ...c, faceUp: false } : c
  )
  const nextPlayer: 1 | 2 =
    state.playerMode === 2 || state.playerMode === 'bot'
      ? state.currentPlayer === 1
        ? 2
        : 1
      : 1

  return {
    ...state,
    cards: nextCards,
    flippedIds: [],
    currentPlayer: nextPlayer,
    isResolvingMismatch: false,
  }
}

export function pickBotMemoryCard(
  state: MemoryGameState,
  knownSymbols: Record<string, MemorySymbolId>,
  rng: () => number = Math.random
): string | null {
  const available = state.cards.filter((c) => !c.faceUp && !c.matched)
  if (available.length === 0) return null

  // If bot has already flipped 1 card, check if it remembers where its match is
  if (state.flippedIds.length === 1) {
    const firstCard = state.cards.find((c) => c.id === state.flippedIds[0])
    if (firstCard) {
      const rememberedMatch = available.find(
        (c) => c.id !== firstCard.id && knownSymbols[c.id] === firstCard.symbolId
      )
      if (rememberedMatch) return rememberedMatch.id
    }
  }

  // On first flip, check if bot remembers any complete unmatched pair
  if (state.flippedIds.length === 0) {
    const seenBySymbol = new Map<MemorySymbolId, string[]>()
    for (const card of available) {
      const sym = knownSymbols[card.id]
      if (!sym) continue
      const list = seenBySymbol.get(sym) ?? []
      list.push(card.id)
      seenBySymbol.set(sym, list)
      if (list.length >= 2) {
        return list[0]
      }
    }
  }

  // Otherwise pick an unseen card if possible, or any available card
  const unseen = available.filter((c) => !knownSymbols[c.id])
  const pool = unseen.length > 0 ? unseen : available
  const idx = Math.floor(rng() * pool.length)
  return pool[idx]?.id ?? null
}

export function isMemoryWon(state: MemoryGameState): boolean {
  return state.cards.length > 0 && state.cards.every((c) => c.matched)
}
