import { describe, expect, it } from 'vitest'
import {
  createTrashGame,
  discardActiveTrashCard,
  drawFromTrashPile,
  getValidSlotIndices,
  placeTrashCardInSlot,
  stepBotTrashTurn,
} from './engine'

describe('Trash / Garbage engine', () => {
  it('deals 10 face-down slots per player and 1 discard card', () => {
    const state = createTrashGame(2, 'quick', () => 0.5)
    expect(state.players).toHaveLength(2)
    expect(state.players[0].slots).toHaveLength(10)
    expect(state.players[1].slots).toHaveLength(10)
    expect(state.players[0].slots.every((s) => !s.revealed)).toBe(true)
    expect(state.discardPile).toHaveLength(1)
    expect(state.stock).toHaveLength(52 - 20 - 1)
  })

  it('uses 2 decks for 3 or 4 players', () => {
    const state = createTrashGame(4, 'classic', () => 0.5)
    expect(state.players).toHaveLength(4)
    expect(state.stock).toHaveLength(104 - 40 - 1)
    expect(state.targetRounds).toBe(3)
  })

  it('treats Jacks as wild and Queens/Kings as trash', () => {
    const state = createTrashGame(2, 'quick', () => 0.5)
    const slots = state.players[0].slots

    const jack = { id: 'spades-11', suit: 'spades' as const, rank: 11 as const, faceUp: true }
    const queen = { id: 'hearts-12', suit: 'hearts' as const, rank: 12 as const, faceUp: true }
    const five = { id: 'clubs-5', suit: 'clubs' as const, rank: 5 as const, faceUp: true }

    expect(getValidSlotIndices(slots, jack)).toHaveLength(10)
    expect(getValidSlotIndices(slots, queen)).toEqual([])
    expect(getValidSlotIndices(slots, five)).toEqual([4])
  })

  it('chains placed cards and ends turn on discard', () => {
    let state = createTrashGame(2, 'quick', () => 0.5)
    const five = { id: 'test-5', suit: 'hearts' as const, rank: 5 as const, faceUp: true }
    state = {
      ...state,
      phase: 'human-place',
      activeCard: five,
    }

    const afterPlace = placeTrashCardInSlot(state, 4)
    expect(afterPlace.players[0].slots[4].revealed).toBe(true)
    expect(afterPlace.players[0].slots[4].card.rank).toBe(5)
    expect(afterPlace.activeCard).not.toBeNull()

    const afterDiscard = discardActiveTrashCard(afterPlace)
    expect(afterDiscard.activeCard).toBeNull()
    expect(afterDiscard.currentPlayerIndex).toBe(1)
    expect(afterDiscard.phase).toBe('bot-turn')
  })

  it('wins the round when all 10 slots are revealed', () => {
    let state = createTrashGame(2, 'quick', () => 0.5)
    state = {
      ...state,
      phase: 'human-place',
      activeCard: { id: 'test-10', suit: 'spades', rank: 10, faceUp: true },
      players: state.players.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              slots: p.slots.map((s, sIdx) => ({
                ...s,
                revealed: sIdx < 9,
              })),
            }
          : p
      ),
    }

    const wonState = placeTrashCardInSlot(state, 9)
    expect(wonState.phase).toBe('game-over')
    expect(wonState.players[0].roundsWon).toBe(1)
  })

  it('bot draws and completes its turn', () => {
    let state = createTrashGame(2, 'quick', () => 0.5)
    state = drawFromTrashPile(state, 'stock', () => 0.5)
    state = discardActiveTrashCard(state)
    expect(state.phase).toBe('bot-turn')

    const afterBotDraw = stepBotTrashTurn(state, () => 0.5)
    expect(afterBotDraw.activeCard).not.toBeNull()
  })

  it('supports 2-human Pass & Play turn switching', () => {
    let state = createTrashGame(2, 'quick', () => 0.5, 2)
    expect(state.players.every((p) => p.isHuman)).toBe(true)
    expect(state.players[0].name).toBe('Player 1')
    expect(state.players[1].name).toBe('Player 2')

    state = drawFromTrashPile(state, 'stock', () => 0.5)
    state = discardActiveTrashCard(state)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.phase).toBe('human-draw')
    expect(state.statusMessage).toContain('Player 2')
  })
})
