import { describe, expect, it } from 'vitest'
import {
  askForRank,
  chooseBotMove,
  createGoFishGame,
  extractBooks,
  getGoFishWinners,
  resolveGoFishDraw,
} from './engine'
import type { Card } from '../solitaire/types'

function card(suit: Card['suit'], rank: Card['rank'], faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp }
}

describe('Go Fish engine', () => {
  it('deals 7 cards each for 2 players and 5 cards each for 4 players', () => {
    const g2 = createGoFishGame(2, 'gentle', () => 0.42)
    expect(g2.players).toHaveLength(2)
    const g2Total =
      g2.players.reduce((s, p) => s + p.hand.length + p.books.length * 4, 0) +
      g2.pond.length
    expect(g2Total).toBe(52)
    expect(g2.players[0].hand.length + g2.players[0].books.length * 4).toBe(7)

    const g4 = createGoFishGame(4, 'clever', () => 0.42)
    expect(g4.players).toHaveLength(4)
    const g4Total =
      g4.players.reduce((s, p) => s + p.hand.length + p.books.length * 4, 0) +
      g4.pond.length
    expect(g4Total).toBe(52)
  })

  it('extracts books of 4 matching ranks cleanly', () => {
    const hand = [
      card('spades', 7),
      card('hearts', 7),
      card('clubs', 7),
      card('diamonds', 7),
      card('spades', 1),
    ]
    const { remaining, newBooks } = extractBooks(hand)
    expect(newBooks).toEqual([7])
    expect(remaining).toHaveLength(1)
    expect(remaining[0].rank).toBe(1)
  })

  it('transfers matching cards, forms books, and keeps turn on hit', () => {
    const state = createGoFishGame(2, 'gentle', () => 0.5)
    state.players[0].hand = [card('spades', 5), card('hearts', 5), card('clubs', 5)]
    state.players[1].hand = [card('diamonds', 5, false), card('spades', 9, false)]
    state.pond = [card('clubs', 2, false)]

    const res = askForRank(state, state.players[1].id, 5)
    expect(res.gotCards).toBe(1)
    expect(res.newBooks).toEqual([5])
    expect(res.nextState.players[0].books).toContain(5)
    expect(res.nextState.currentPlayerIndex).toBe(0)
    expect(res.nextState.phase).toBe('human-pick')
  })

  it('prompts Go Fish on miss and keeps turn on lucky catch', () => {
    const state = createGoFishGame(2, 'gentle', () => 0.5)
    state.players[0].hand = [card('spades', 4)]
    state.players[1].hand = [card('hearts', 9, false)]
    state.pond = [card('clubs', 2, false), card('diamonds', 4, false)]

    const miss = askForRank(state, state.players[1].id, 4)
    expect(miss.gotCards).toBe(0)
    expect(miss.nextState.phase).toBe('human-go-fish')

    const drawn = resolveGoFishDraw(miss.nextState)
    expect(drawn.nextState.currentPlayerIndex).toBe(0)
    expect(drawn.nextState.phase).toBe('human-pick')
    expect(drawn.nextState.players[0].hand.map((c) => c.rank)).toEqual([4, 4])
  })

  it('clever bot prioritizes ranks recently asked by an opponent', () => {
    const state = createGoFishGame(3, 'clever', () => 0.5)
    state.currentPlayerIndex = 1
    state.phase = 'bot-turn'
    state.players[0].hand = [card('spades', 8)]
    state.players[1].hand = [card('hearts', 8, false), card('clubs', 3, false)]
    state.players[2].hand = [card('diamonds', 2, false)]
    state.recentAsks = [{ playerId: 'human', rank: 8 }]

    const move = chooseBotMove(state)
    expect(move).toEqual({ targetId: 'human', rank: 8 })
  })

  it('determines winner by highest book count', () => {
    const state = createGoFishGame(2, 'gentle', () => 0.5)
    state.players[0].books = [1, 2, 3, 4, 5, 6, 7]
    state.players[1].books = [8, 9, 10, 11, 12, 13]
    const winners = getGoFishWinners(state)
    expect(winners).toHaveLength(1)
    expect(winners[0].id).toBe('human')
  })
})
