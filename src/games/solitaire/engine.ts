import type { DrawCount, SolitaireDifficulty } from '../../config/appDefaults'
import type { Card, MoveHint, MoveResult, PileLocation, Rank, SolitaireState, Suit } from './types'

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

export function getRankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A'
    case 11:
      return 'J'
    case 12:
      return 'Q'
    case 13:
      return 'K'
    default:
      return String(rank)
  }
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades':
      return '♠'
    case 'hearts':
      return '♥'
    case 'clubs':
      return '♣'
    case 'diamonds':
      return '♦'
  }
}

export function getDifficultyDrawCount(difficulty: SolitaireDifficulty): DrawCount {
  return difficulty === 'hard' ? 3 : 1
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: false,
      })
    }
  }
  return deck
}

export function shuffleDeck(cards: Card[], rng: () => number = Math.random): Card[] {
  const copy = cards.map((c) => ({ ...c }))
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildDeal(
  drawCount: DrawCount,
  difficulty: SolitaireDifficulty,
  rng: () => number
): SolitaireState {
  const deck = shuffleDeck(createDeck(), rng)
  const tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]] = [
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ]

  let cursor = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cursor++], faceUp: row === col }
      tableau[col].push(card)
    }
  }

  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }))

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
    difficulty,
    moves: 0,
    score: 0,
  }
}

function scoreEasyDeal(state: SolitaireState): number {
  let score = 0
  for (const col of state.tableau) {
    const top = col[col.length - 1]
    if (top && top.rank <= 3) score += 2
  }
  // Check if any immediate tableau moves exist
  for (let i = 0; i < 7; i++) {
    const a = state.tableau[i][state.tableau[i].length - 1]
    if (!a) continue
    for (let j = 0; j < 7; j++) {
      if (i === j) continue
      const b = state.tableau[j]
      if (b.length > 0 && isRedSuit(a.suit) !== isRedSuit(b[b.length - 1].suit) && b[b.length - 1].rank === a.rank + 1) {
        score += 3
      }
    }
  }
  return score
}

export function dealKlondike(
  drawCount: DrawCount = 1,
  rng: () => number = Math.random,
  difficulty: SolitaireDifficulty = drawCount === 3 ? 'hard' : 'easy'
): SolitaireState {
  if (difficulty === 'normal') {
    return buildDeal(drawCount, difficulty, rng)
  }

  if (difficulty === 'easy') {
    let best = buildDeal(drawCount, difficulty, rng)
    let bestScore = scoreEasyDeal(best)
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = buildDeal(drawCount, difficulty, rng)
      const candidateScore = scoreEasyDeal(candidate)
      if (candidateScore > bestScore) {
        best = candidate
        bestScore = candidateScore
      }
      if (bestScore >= 5) break
    }
    return best
  }

  // Hard: pick a trickier opening layout with fewer immediate moves
  let trickiest = buildDeal(drawCount, difficulty, rng)
  let lowestScore = scoreEasyDeal(trickiest)
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = buildDeal(drawCount, difficulty, rng)
    const candidateScore = scoreEasyDeal(candidate)
    if (candidateScore < lowestScore) {
      trickiest = candidate
      lowestScore = candidateScore
    }
    if (lowestScore === 0) break
  }
  return trickiest
}

export function cloneState(state: SolitaireState): SolitaireState {
  return {
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
    foundations: [
      state.foundations[0].map((c) => ({ ...c })),
      state.foundations[1].map((c) => ({ ...c })),
      state.foundations[2].map((c) => ({ ...c })),
      state.foundations[3].map((c) => ({ ...c })),
    ],
    tableau: [
      state.tableau[0].map((c) => ({ ...c })),
      state.tableau[1].map((c) => ({ ...c })),
      state.tableau[2].map((c) => ({ ...c })),
      state.tableau[3].map((c) => ({ ...c })),
      state.tableau[4].map((c) => ({ ...c })),
      state.tableau[5].map((c) => ({ ...c })),
      state.tableau[6].map((c) => ({ ...c })),
    ],
    drawCount: state.drawCount,
    difficulty: state.difficulty,
    moves: state.moves,
    score: state.score,
  }
}

export function canMoveToFoundation(card: Card, foundationPile: Card[]): boolean {
  if (!card.faceUp) return false
  if (foundationPile.length === 0) {
    return card.rank === 1
  }
  const top = foundationPile[foundationPile.length - 1]
  return top.suit === card.suit && card.rank === top.rank + 1
}

export function canMoveToTableau(movingTopCard: Card, targetPile: Card[]): boolean {
  if (!movingTopCard.faceUp) return false
  if (targetPile.length === 0) {
    return movingTopCard.rank === 13
  }
  const top = targetPile[targetPile.length - 1]
  if (!top.faceUp) return false
  return isRedSuit(top.suit) !== isRedSuit(movingTopCard.suit) && top.rank === movingTopCard.rank + 1
}

export function drawFromStock(state: SolitaireState): SolitaireState {
  if (state.stock.length === 0 && state.waste.length === 0) {
    return state
  }

  const next = cloneState(state)

  if (next.stock.length > 0) {
    const count = Math.min(next.drawCount, next.stock.length)
    for (let i = 0; i < count; i++) {
      const card = next.stock.pop()!
      card.faceUp = true
      next.waste.push(card)
    }
    next.moves += 1
    return next
  }

  // Recycle waste back to stock
  while (next.waste.length > 0) {
    const card = next.waste.pop()!
    card.faceUp = false
    next.stock.push(card)
  }
  next.moves += 1
  return next
}

export function getMovingCards(state: SolitaireState, from: PileLocation): Card[] {
  if (from.zone === 'waste') {
    if (state.waste.length === 0) return []
    return [state.waste[state.waste.length - 1]]
  }
  if (from.zone === 'foundation') {
    const pile = state.foundations[from.index]
    if (!pile || pile.length === 0) return []
    return [pile[pile.length - 1]]
  }
  if (from.zone === 'tableau') {
    const pile = state.tableau[from.index]
    if (!pile || pile.length === 0) return []
    const idx = from.cardIndex ?? pile.length - 1
    if (idx < 0 || idx >= pile.length) return []
    if (!pile[idx].faceUp) return []
    return pile.slice(idx)
  }
  return []
}

export function moveCards(
  state: SolitaireState,
  from: PileLocation,
  to: PileLocation
): MoveResult {
  const moving = getMovingCards(state, from)
  if (moving.length === 0) {
    return { nextState: state, moved: false, flipped: false, toFoundation: false }
  }

  if (from.zone === to.zone && 'index' in from && 'index' in to && from.index === to.index) {
    return { nextState: state, moved: false, flipped: false, toFoundation: false }
  }

  const leadCard = moving[0]

  if (to.zone === 'foundation') {
    if (moving.length !== 1) {
      return { nextState: state, moved: false, flipped: false, toFoundation: false }
    }
    const targetPile = state.foundations[to.index]
    if (!targetPile || !canMoveToFoundation(leadCard, targetPile)) {
      return { nextState: state, moved: false, flipped: false, toFoundation: false }
    }
  } else if (to.zone === 'tableau') {
    const targetPile = state.tableau[to.index]
    if (!targetPile || !canMoveToTableau(leadCard, targetPile)) {
      return { nextState: state, moved: false, flipped: false, toFoundation: false }
    }
  } else {
    return { nextState: state, moved: false, flipped: false, toFoundation: false }
  }

  const next = cloneState(state)
  let removed: Card[] = []
  let flipped = false

  if (from.zone === 'waste') {
    const c = next.waste.pop()
    if (c) removed = [c]
  } else if (from.zone === 'foundation') {
    const c = next.foundations[from.index].pop()
    if (c) removed = [c]
  } else if (from.zone === 'tableau') {
    const sourcePile = next.tableau[from.index]
    const idx = from.cardIndex ?? sourcePile.length - 1
    removed = sourcePile.splice(idx)
    if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
      sourcePile[sourcePile.length - 1].faceUp = true
      flipped = true
      next.score += 5
    }
  }

  if (to.zone === 'foundation') {
    next.foundations[to.index].push(...removed)
    next.score += 10
  } else if (to.zone === 'tableau') {
    next.tableau[to.index].push(...removed)
    if (from.zone === 'waste') {
      next.score += 5
    }
  }

  next.moves += 1
  return {
    nextState: next,
    moved: true,
    flipped,
    toFoundation: to.zone === 'foundation',
  }
}

export function findAutoMoveTarget(state: SolitaireState, from: PileLocation): PileLocation | null {
  const moving = getMovingCards(state, from)
  if (moving.length === 0) return null

  const lead = moving[0]

  // 1. Prefer foundation for single cards (unless already in foundation)
  if (moving.length === 1 && from.zone !== 'foundation') {
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(lead, state.foundations[f])) {
        return { zone: 'foundation', index: f }
      }
    }
  }

  // 2. Otherwise try non-empty tableau columns first, then empty columns
  for (let col = 0; col < 7; col++) {
    if (from.zone === 'tableau' && from.index === col) continue
    if (state.tableau[col].length > 0 && canMoveToTableau(lead, state.tableau[col])) {
      return { zone: 'tableau', index: col }
    }
  }

  for (let col = 0; col < 7; col++) {
    if (from.zone === 'tableau' && from.index === col) continue
    if (state.tableau[col].length === 0 && canMoveToTableau(lead, state.tableau[col])) {
      // Avoid pointless King shuffle from empty column to empty column
      if (from.zone === 'tableau' && (from.cardIndex ?? 0) === 0) continue
      return { zone: 'tableau', index: col }
    }
  }

  return null
}

export function findHint(state: SolitaireState): MoveHint | null {
  // 1. Check Waste -> Foundation
  if (state.waste.length > 0) {
    const wasteTop = state.waste[state.waste.length - 1]
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(wasteTop, state.foundations[f])) {
        return {
          from: { zone: 'waste' },
          to: { zone: 'foundation', index: f },
          label: `Move ${getRankLabel(wasteTop.rank)}${getSuitSymbol(wasteTop.suit)} to Foundation`,
        }
      }
    }
  }

  // 2. Check Tableau top -> Foundation
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]
    if (pile.length === 0) continue
    const top = pile[pile.length - 1]
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(top, state.foundations[f])) {
        return {
          from: { zone: 'tableau', index: col, cardIndex: pile.length - 1 },
          to: { zone: 'foundation', index: f },
          label: `Move ${getRankLabel(top.rank)}${getSuitSymbol(top.suit)} to Foundation`,
        }
      }
    }
  }

  // 3. Check Tableau -> Tableau that reveals a face-down card or frees an empty column
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]
    const firstFaceUpIdx = pile.findIndex((c) => c.faceUp)
    if (firstFaceUpIdx === -1) continue
    const lead = pile[firstFaceUpIdx]

    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (targetCol === col) continue
      const targetPile = state.tableau[targetCol]
      // Avoid moving a King from index 0 to another empty column
      if (firstFaceUpIdx === 0 && targetPile.length === 0) continue
      if (canMoveToTableau(lead, targetPile)) {
        return {
          from: { zone: 'tableau', index: col, cardIndex: firstFaceUpIdx },
          to: { zone: 'tableau', index: targetCol },
          label: `Move ${getRankLabel(lead.rank)}${getSuitSymbol(lead.suit)} to column ${targetCol + 1}`,
        }
      }
    }
  }

  // 4. Check Waste -> Tableau
  if (state.waste.length > 0) {
    const wasteTop = state.waste[state.waste.length - 1]
    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (canMoveToTableau(wasteTop, state.tableau[targetCol])) {
        return {
          from: { zone: 'waste' },
          to: { zone: 'tableau', index: targetCol },
          label: `Move ${getRankLabel(wasteTop.rank)}${getSuitSymbol(wasteTop.suit)} to column ${targetCol + 1}`,
        }
      }
    }
  }

  // 5. Draw from Stock
  if (state.stock.length > 0 || state.waste.length > 0) {
    return {
      from: { zone: 'stock' },
      to: { zone: 'stock' },
      label: state.stock.length > 0 ? 'Draw from Stock' : 'Recycle Waste pile',
    }
  }

  return null
}

export function isGameWon(state: SolitaireState): boolean {
  return state.foundations.every((pile) => pile.length === 13)
}

export function canAutoComplete(state: SolitaireState): boolean {
  if (isGameWon(state)) return false
  if (state.stock.length > 0 || state.waste.length > 0) return false
  return state.tableau.every((pile) => pile.every((card) => card.faceUp))
}

export function stepAutoComplete(state: SolitaireState): SolitaireState | null {
  let bestMove: { col: number; foundationIdx: number; rank: Rank } | null = null

  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]
    if (pile.length === 0) continue
    const top = pile[pile.length - 1]
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(top, state.foundations[f])) {
        if (!bestMove || top.rank < bestMove.rank) {
          bestMove = { col, foundationIdx: f, rank: top.rank }
        }
        break
      }
    }
  }

  if (!bestMove) return null

  const result = moveCards(
    state,
    { zone: 'tableau', index: bestMove.col, cardIndex: state.tableau[bestMove.col].length - 1 },
    { zone: 'foundation', index: bestMove.foundationIdx }
  )
  return result.moved ? result.nextState : null
}

function canWasteTopMoveAnywhere(state: SolitaireState): boolean {
  if (state.waste.length === 0) return false
  const top = state.waste[state.waste.length - 1]
  for (let f = 0; f < 4; f++) {
    if (canMoveToFoundation(top, state.foundations[f])) return true
  }
  for (let col = 0; col < 7; col++) {
    if (canMoveToTableau(top, state.tableau[col])) return true
  }
  return false
}

export function hasAnyProgressMoves(state: SolitaireState): boolean {
  if (isGameWon(state)) return true

  // 1. Tableau top -> Foundation
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]
    if (pile.length === 0) continue
    const top = pile[pile.length - 1]
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(top, state.foundations[f])) return true
    }
  }

  // 2. Meaningful Tableau -> Tableau moves
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]
    const firstFaceUpIdx = pile.findIndex((c) => c.faceUp)
    if (firstFaceUpIdx === -1) continue

    const lead = pile[firstFaceUpIdx]
    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (targetCol === col) continue
      const targetPile = state.tableau[targetCol]
      if (firstFaceUpIdx === 0 && targetPile.length === 0) continue
      if (canMoveToTableau(lead, targetPile)) return true
    }

    // Sub-stack move that uncovers a card able to go straight to Foundation
    for (let idx = firstFaceUpIdx + 1; idx < pile.length; idx++) {
      const subLead = pile[idx]
      const uncovered = pile[idx - 1]
      const uncoveredToFoundation = state.foundations.some((fPile) =>
        canMoveToFoundation(uncovered, fPile)
      )
      if (!uncoveredToFoundation) continue

      for (let targetCol = 0; targetCol < 7; targetCol++) {
        if (targetCol === col) continue
        if (canMoveToTableau(subLead, state.tableau[targetCol])) return true
      }
    }
  }

  // 3. Check current waste + cycling through stock/waste
  if (canWasteTopMoveAnywhere(state)) return true

  const totalStockWaste = state.stock.length + state.waste.length
  if (totalStockWaste > 0) {
    let sim = cloneState(state)
    const maxDraws = totalStockWaste + 2
    for (let i = 0; i < maxDraws; i++) {
      sim = drawFromStock(sim)
      if (canWasteTopMoveAnywhere(sim)) return true
    }
  }

  return false
}

