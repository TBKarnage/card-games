import type { Card } from '../solitaire/types'
import { createDeck, getRankLabel, shuffleDeck } from '../solitaire/engine'
import type {
  TrashMatchMode,
  TrashPlayer,
  TrashPlayerCount,
  TrashSlot,
  TrashState,
} from './types'

export const TRASH_PLAYER_OPTIONS: Array<{
  id: TrashPlayerCount
  label: string
  hint: string
}> = [
  { id: 2, label: '2 Players', hint: 'You vs. Barnaby Bear' },
  { id: 3, label: '3 Players', hint: 'You + 2 tablebots' },
  { id: 4, label: '4 Players', hint: 'Full cozy table' },
]

export const TRASH_MODE_OPTIONS: Array<{
  id: TrashMatchMode
  label: string
  hint: string
}> = [
  { id: 'quick', label: 'Quick (1 Round)', hint: 'First to fill 10 slots wins' },
  { id: 'classic', label: 'Classic (First to 3)', hint: 'Best-of-3 rounds match' },
]

const BOT_PROFILES: Array<{
  id: string
  name: string
  avatar: 'bear' | 'fox' | 'owl'
}> = [
  { id: 'bot-1', name: 'Barnaby Bear', avatar: 'bear' },
  { id: 'bot-2', name: 'Pip Fox', avatar: 'fox' },
  { id: 'bot-3', name: 'Tilly Owl', avatar: 'owl' },
]

export function isWildCard(card: Card): boolean {
  return card.rank === 11 // Jacks are wild
}

export function isTrashCard(card: Card): boolean {
  return card.rank === 12 || card.rank === 13 // Queens & Kings are Trash
}

export function getValidSlotIndices(slots: TrashSlot[], card: Card): number[] {
  if (isTrashCard(card)) return []
  if (isWildCard(card)) {
    return slots
      .map((s, idx) => (!s.revealed ? idx : -1))
      .filter((idx) => idx !== -1)
  }
  const targetIdx = card.rank - 1
  if (targetIdx >= 0 && targetIdx < slots.length && !slots[targetIdx].revealed) {
    return [targetIdx]
  }
  return []
}

function dealRound(
  existingPlayers: TrashPlayer[],
  playerCount: TrashPlayerCount,
  matchMode: TrashMatchMode,
  roundNumber: number,
  rng: () => number = Math.random
): TrashState {
  // Use 1 deck for 2 players, 2 decks for 3-4 players so there are plenty of cards
  const baseDeck =
    playerCount <= 2
      ? createDeck()
      : [
          ...createDeck().map((c) => ({ ...c, id: `d1-${c.id}` })),
          ...createDeck().map((c) => ({ ...c, id: `d2-${c.id}` })),
        ]

  const deck = shuffleDeck(baseDeck, rng)
  let cursor = 0

  const players: TrashPlayer[] = existingPlayers.map((p) => {
    const slots: TrashSlot[] = []
    for (let s = 1; s <= 10; s++) {
      slots.push({
        slotNumber: s,
        card: { ...deck[cursor++], faceUp: false },
        revealed: false,
      })
    }
    return {
      ...p,
      slots,
    }
  })

  const firstDiscard = { ...deck[cursor++], faceUp: true }
  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }))

  const multiHuman = existingPlayers.filter((p) => p.isHuman).length > 1

  return {
    players,
    stock,
    discardPile: [firstDiscard],
    currentPlayerIndex: 0,
    phase: 'human-draw',
    playerCount,
    matchMode,
    roundNumber,
    targetRounds: matchMode === 'classic' ? 3 : 1,
    activeCard: null,
    statusMessage: multiHuman
      ? `${players[0].name}'s turn! Draw from the Deck or take the Discard card.`
      : 'Your turn! Draw from the Deck or take the Discard card.',
    lastActionText: null,
    turns: 0,
  }
}

export function createTrashGame(
  playerCount: TrashPlayerCount = 2,
  matchMode: TrashMatchMode = 'quick',
  rng: () => number = Math.random,
  humanCount: 1 | 2 = 1
): TrashState {
  const players: TrashPlayer[] =
    humanCount === 2
      ? [
          {
            id: 'human-1',
            name: 'Player 1',
            avatar: 'you',
            isHuman: true,
            slots: [],
            roundsWon: 0,
          },
          {
            id: 'human-2',
            name: 'Player 2',
            avatar: 'bear',
            isHuman: true,
            slots: [],
            roundsWon: 0,
          },
          ...BOT_PROFILES.slice(0, Math.max(0, playerCount - 2)).map((bot) => ({
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            isHuman: false,
            slots: [],
            roundsWon: 0,
          })),
        ]
      : [
          {
            id: 'human',
            name: 'You',
            avatar: 'you',
            isHuman: true,
            slots: [],
            roundsWon: 0,
          },
          ...BOT_PROFILES.slice(0, playerCount - 1).map((bot) => ({
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            isHuman: false,
            slots: [],
            roundsWon: 0,
          })),
        ]

  return dealRound(players, playerCount, matchMode, 1, rng)
}

export function startNextTrashRound(
  state: TrashState,
  rng: () => number = Math.random
): TrashState {
  return dealRound(
    state.players,
    state.playerCount,
    state.matchMode,
    state.roundNumber + 1,
    rng
  )
}

function replenishStockIfNeeded(
  stock: Card[],
  discardPile: Card[],
  rng: () => number = Math.random
): { stock: Card[]; discardPile: Card[] } {
  if (stock.length > 0 || discardPile.length <= 1) {
    return { stock, discardPile }
  }
  const topDiscard = discardPile[discardPile.length - 1]
  const recycled = shuffleDeck(
    discardPile.slice(0, -1).map((c) => ({ ...c, faceUp: false })),
    rng
  )
  return {
    stock: recycled,
    discardPile: [topDiscard],
  }
}

export function drawFromTrashPile(
  state: TrashState,
  source: 'stock' | 'discard',
  rng: () => number = Math.random
): TrashState {
  if (state.phase !== 'human-draw' && state.phase !== 'bot-turn') return state

  let stock = [...state.stock]
  let discardPile = [...state.discardPile]

  if (source === 'stock') {
    const replenished = replenishStockIfNeeded(stock, discardPile, rng)
    stock = replenished.stock
    discardPile = replenished.discardPile
  }

  const drawn =
    source === 'stock' ? stock.pop() ?? null : discardPile.pop() ?? null
  if (!drawn) return state

  const activeCard: Card = { ...drawn, faceUp: true }
  const current = state.players[state.currentPlayerIndex]
  const validSlots = getValidSlotIndices(current.slots, activeCard)

  const rankLabel = getRankLabel(activeCard.rank)
  let statusMessage = state.statusMessage

  if (current.isHuman) {
    if (validSlots.length === 0) {
      statusMessage = `${rankLabel} is Trash! Tap the Discard Pile to end your turn.`
    } else if (isWildCard(activeCard)) {
      statusMessage = `Jack is Wild! Tap any face-down slot (1–10) to place it.`
    } else {
      statusMessage = `Place the ${rankLabel} in slot ${activeCard.rank}!`
    }
  }

  return {
    ...state,
    stock,
    discardPile,
    activeCard,
    phase: current.isHuman ? 'human-place' : 'bot-turn',
    statusMessage,
  }
}

export function placeTrashCardInSlot(
  state: TrashState,
  slotIndex: number
): TrashState {
  if (!state.activeCard) return state
  const current = state.players[state.currentPlayerIndex]
  const validSlots = getValidSlotIndices(current.slots, state.activeCard)
  if (!validSlots.includes(slotIndex)) return state

  const replacedCard = { ...current.slots[slotIndex].card, faceUp: true }
  const placedCard = { ...state.activeCard, faceUp: true }

  const nextPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentPlayerIndex) return p
    const nextSlots = p.slots.map((slot, sIdx) =>
      sIdx === slotIndex ? { ...slot, card: placedCard, revealed: true } : slot
    )
    return { ...p, slots: nextSlots }
  })

  const updatedCurrent = nextPlayers[state.currentPlayerIndex]
  const allRevealed = updatedCurrent.slots.every((s) => s.revealed)

  if (allRevealed) {
    const finalPlayers = nextPlayers.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? { ...p, roundsWon: p.roundsWon + 1 }
        : p
    )
    const winner = finalPlayers[state.currentPlayerIndex]
    const matchOver = winner.roundsWon >= state.targetRounds

    return {
      ...state,
      players: finalPlayers,
      activeCard: null,
      phase: matchOver ? 'game-over' : 'round-over',
      turns: state.turns + 1,
      lastActionText: `${winner.name} cleared all 10 slots!`,
      statusMessage: matchOver
        ? `${winner.name} won the match!`
        : `${winner.name} won Round ${state.roundNumber}!`,
    }
  }

  const nextValid = getValidSlotIndices(updatedCurrent.slots, replacedCard)
  const replacedLabel = getRankLabel(replacedCard.rank)
  let statusMessage = state.statusMessage

  if (updatedCurrent.isHuman) {
    if (nextValid.length === 0) {
      statusMessage = `Uncovered ${replacedLabel} — that's Trash! Tap Discard to end your turn.`
    } else if (isWildCard(replacedCard)) {
      statusMessage = `Uncovered a Wild Jack! Tap any face-down slot.`
    } else {
      statusMessage = `Nice! Uncovered ${replacedLabel} — place it in slot ${replacedCard.rank}!`
    }
  }

  return {
    ...state,
    players: nextPlayers,
    activeCard: replacedCard,
    statusMessage,
  }
}

export function discardActiveTrashCard(state: TrashState): TrashState {
  if (!state.activeCard) return state
  const current = state.players[state.currentPlayerIndex]
  const discarded: Card = { ...state.activeCard, faceUp: true }
  const nextDiscard = [...state.discardPile, discarded]
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length
  const nextPlayer = state.players[nextIdx]

  const multiHuman = state.players.filter((p) => p.isHuman).length > 1

  return {
    ...state,
    discardPile: nextDiscard,
    activeCard: null,
    currentPlayerIndex: nextIdx,
    phase: nextPlayer.isHuman ? 'human-draw' : 'bot-turn',
    turns: state.turns + 1,
    lastActionText: `${current.name} discarded ${getRankLabel(discarded.rank)}.`,
    statusMessage: nextPlayer.isHuman
      ? `${multiHuman ? `${nextPlayer.name}'s turn` : 'Your turn'}! Draw from the Deck or take ${getRankLabel(discarded.rank)} from Discard.`
      : `${nextPlayer.name}'s turn...`,
  }
}

export function stepBotTrashTurn(
  state: TrashState,
  rng: () => number = Math.random
): TrashState {
  const current = state.players[state.currentPlayerIndex]
  if (!current || current.isHuman) return state

  if (!state.activeCard) {
    const topDiscard = state.discardPile[state.discardPile.length - 1]
    const canUseDiscard =
      topDiscard !== undefined &&
      getValidSlotIndices(current.slots, topDiscard).length > 0

    return drawFromTrashPile(state, canUseDiscard ? 'discard' : 'stock', rng)
  }

  const validSlots = getValidSlotIndices(current.slots, state.activeCard)
  if (validSlots.length > 0) {
    const chosenSlot = validSlots[0]
    return placeTrashCardInSlot(state, chosenSlot)
  }

  return discardActiveTrashCard(state)
}
