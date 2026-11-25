import { describe, expect, it } from 'vitest'
import {
  canAutoComplete,
  canMoveToFoundation,
  canMoveToTableau,
  createDeck,
  dealKlondike,
  drawFromStock,
  findHint,
  hasAnyProgressMoves,
  isGameWon,
  moveCards,
  stepAutoComplete,
} from './engine'
import type { Card, SolitaireState } from './types'

function card(suit: Card['suit'], rank: Card['rank'], faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp }
}

describe('Klondike Solitaire Engine', () => {
  it('deals 52 unique cards into 7 tableau columns and 24 stock cards', () => {
    const state = dealKlondike(1, () => 0.42)
    const tableauCounts = state.tableau.map((col) => col.length)
    expect(tableauCounts).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(state.stock).toHaveLength(24)
    expect(state.waste).toHaveLength(0)

    // Only the top card of each column is faceUp
    state.tableau.forEach((col) => {
      col.forEach((c, idx) => {
        expect(c.faceUp).toBe(idx === col.length - 1)
      })
    })

    // 52 unique IDs
    const allIds = new Set([
      ...state.stock.map((c) => c.id),
      ...state.tableau.flat().map((c) => c.id),
    ])
    expect(allIds.size).toBe(52)
  })

  it('draws 1 or 3 cards from stock and recycles waste when stock is empty', () => {
    let state = dealKlondike(3)
    state = drawFromStock(state)
    expect(state.waste).toHaveLength(3)
    expect(state.stock).toHaveLength(21)
    expect(state.waste.every((c) => c.faceUp)).toBe(true)

    // Exhaust stock
    for (let i = 0; i < 7; i++) {
      state = drawFromStock(state)
    }
    expect(state.stock).toHaveLength(0)
    expect(state.waste).toHaveLength(24)

    // Recycle waste back to stock
    state = drawFromStock(state)
    expect(state.stock).toHaveLength(24)
    expect(state.waste).toHaveLength(0)
    expect(state.stock.every((c) => !c.faceUp)).toBe(true)
  })

  it('validates foundation and tableau placement rules', () => {
    const aceHearts = card('hearts', 1)
    const twoHearts = card('hearts', 2)
    const twoSpades = card('spades', 2)
    const kingSpades = card('spades', 13)
    const queenHearts = card('hearts', 12)

    expect(canMoveToFoundation(aceHearts, [])).toBe(true)
    expect(canMoveToFoundation(twoHearts, [])).toBe(false)
    expect(canMoveToFoundation(twoHearts, [aceHearts])).toBe(true)
    expect(canMoveToFoundation(twoSpades, [aceHearts])).toBe(false)

    expect(canMoveToTableau(kingSpades, [])).toBe(true)
    expect(canMoveToTableau(queenHearts, [])).toBe(false)
    expect(canMoveToTableau(queenHearts, [kingSpades])).toBe(true)
    expect(canMoveToTableau(card('diamonds', 12), [aceHearts])).toBe(false)
  })

  it('flips newly exposed tableau card after moving a stack', () => {
    const state: SolitaireState = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [card('clubs', 5, false), card('hearts', 7, true)],
        [card('spades', 8, true)],
        [],
        [],
        [],
        [],
        [],
      ],
      drawCount: 1,
      difficulty: 'easy',
      moves: 0,
      score: 0,
    }

    const res = moveCards(
      state,
      { zone: 'tableau', index: 0, cardIndex: 1 },
      { zone: 'tableau', index: 1 }
    )
    expect(res.moved).toBe(true)
    expect(res.flipped).toBe(true)
    expect(res.nextState.tableau[0][0].faceUp).toBe(true)
    expect(res.nextState.tableau[1]).toHaveLength(2)
  })

  it('detects auto-complete readiness and steps to win', () => {
    const deck = createDeck()
    const spades = deck.filter((c) => c.suit === 'spades').map((c) => ({ ...c, faceUp: true }))
    const hearts = deck.filter((c) => c.suit === 'hearts').map((c) => ({ ...c, faceUp: true }))
    const clubs = deck.filter((c) => c.suit === 'clubs').map((c) => ({ ...c, faceUp: true }))
    const diamonds = deck.filter((c) => c.suit === 'diamonds').map((c) => ({ ...c, faceUp: true }))

    let state: SolitaireState = {
      stock: [],
      waste: [],
      foundations: [spades.slice(0, 12), hearts.slice(0, 13), clubs.slice(0, 13), diamonds.slice(0, 13)],
      tableau: [[spades[12]], [], [], [], [], [], []],
      drawCount: 1,
      difficulty: 'easy',
      moves: 10,
      score: 100,
    }

    expect(canAutoComplete(state)).toBe(true)
    expect(isGameWon(state)).toBe(false)

    const next = stepAutoComplete(state)
    expect(next).not.toBeNull()
    state = next!
    expect(isGameWon(state)).toBe(true)
    expect(canAutoComplete(state)).toBe(false)
  })

  it('provides a helpful hint when a foundation move exists', () => {
    const state: SolitaireState = {
      stock: [],
      waste: [card('diamonds', 1, true)],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      drawCount: 1,
      difficulty: 'easy',
      moves: 0,
      score: 0,
    }

    const hint = findHint(state)
    expect(hint).not.toBeNull()
    expect(hint?.from.zone).toBe('waste')
    expect(hint?.to.zone).toBe('foundation')
  })

  it('detects when no progress moves remain vs when stock has a playable card', () => {
    const stuckState: SolitaireState = {
      stock: [card('clubs', 9, false)],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [card('spades', 4, true)],
        [card('clubs', 4, true)],
        [],
        [],
        [],
        [],
        [],
      ],
      drawCount: 1,
      difficulty: 'normal',
      moves: 5,
      score: 0,
    }
    expect(hasAnyProgressMoves(stuckState)).toBe(false)

    const playableFromStock: SolitaireState = {
      ...stuckState,
      stock: [card('hearts', 3, false)],
    }
    expect(hasAnyProgressMoves(playableFromStock)).toBe(true)
  })
})
