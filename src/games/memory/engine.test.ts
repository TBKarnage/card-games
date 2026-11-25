import { describe, expect, it } from 'vitest'
import {
  createMemoryGame,
  flipMemoryCard,
  isMemoryWon,
  pickBotMemoryCard,
  resolveMismatch,
} from './engine'

describe('memory match engine', () => {
  it('creates paired decks for 3x4, 4x4, and 4x5 grids', () => {
    const small = createMemoryGame('3x4', 1, () => 0.42)
    expect(small.cards).toHaveLength(12)

    const medium = createMemoryGame('4x4', 1, () => 0.42)
    expect(medium.cards).toHaveLength(16)

    const large = createMemoryGame('4x5', 2, () => 0.42)
    expect(large.cards).toHaveLength(20)
    expect(large.playerMode).toBe(2)
  })

  it('matches pairs, keeps player turn on match, and detects win', () => {
    let state = createMemoryGame('3x4', 2, () => 0.5)
    const first = state.cards[0]
    const mate = state.cards.find(
      (c) => c.symbolId === first.symbolId && c.id !== first.id
    )!

    const res1 = flipMemoryCard(state, first.id)
    expect(res1.outcome).toBe('first-flip')
    state = res1.nextState

    const res2 = flipMemoryCard(state, mate.id)
    expect(res2.outcome).toBe('match')
    state = res2.nextState

    expect(state.moves).toBe(1)
    expect(state.scores).toEqual([1, 0])
    expect(state.currentPlayer).toBe(1) // Player 1 keeps turn on match

    // Match all remaining pairs
    const remainingIds = state.cards.filter((c) => !c.matched).map((c) => c.id)
    while (remainingIds.length > 0) {
      const idA = remainingIds.shift()!
      const cardA = state.cards.find((c) => c.id === idA)!
      const idB = remainingIds.find((id) => {
        const c = state.cards.find((x) => x.id === id)
        return c?.symbolId === cardA.symbolId
      })!
      remainingIds.splice(remainingIds.indexOf(idB), 1)
      state = flipMemoryCard(state, idA).nextState
      state = flipMemoryCard(state, idB).nextState
    }

    expect(isMemoryWon(state)).toBe(true)
  })

  it('locks input on mismatch until resolved and switches turn in 2-player mode', () => {
    let state = createMemoryGame('3x4', 2, () => 0.3)
    const first = state.cards[0]
    const different = state.cards.find((c) => c.symbolId !== first.symbolId)!
    const third = state.cards.find(
      (c) => c.id !== first.id && c.id !== different.id
    )!

    state = flipMemoryCard(state, first.id).nextState
    const mismatchRes = flipMemoryCard(state, different.id)
    expect(mismatchRes.outcome).toBe('mismatch')
    state = mismatchRes.nextState
    expect(state.isResolvingMismatch).toBe(true)

    // Cannot flip a 3rd card while resolving
    const ignored = flipMemoryCard(state, third.id)
    expect(ignored.outcome).toBe('ignored')

    state = resolveMismatch(state)
    expect(state.isResolvingMismatch).toBe(false)
    expect(state.currentPlayer).toBe(2)
    expect(state.cards.find((c) => c.id === first.id)?.faceUp).toBe(false)
    expect(state.cards.find((c) => c.id === different.id)?.faceUp).toBe(false)
  })

  it('switches turns and uses bot memory in vs Robot mode', () => {
    let state = createMemoryGame('3x4', 'bot', () => 0.42)
    const first = state.cards[0]
    const different = state.cards.find((c) => c.symbolId !== first.symbolId)!

    state = flipMemoryCard(state, first.id).nextState
    state = flipMemoryCard(state, different.id).nextState
    state = resolveMismatch(state)
    expect(state.currentPlayer).toBe(2)

    const matchOfFirst = state.cards.find(
      (c) => c.symbolId === first.symbolId && c.id !== first.id
    )!
    const known = {
      [first.id]: first.symbolId,
      [matchOfFirst.id]: matchOfFirst.symbolId,
    }
    const botPick = pickBotMemoryCard(state, known, () => 0)
    expect([first.id, matchOfFirst.id]).toContain(botPick)
  })
})
