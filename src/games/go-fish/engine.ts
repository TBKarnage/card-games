import { createDeck, getRankLabel, shuffleDeck } from '../solitaire/engine'
import type { Card, Rank } from '../solitaire/types'
import type {
  GoFishDifficulty,
  GoFishPlayer,
  GoFishPlayerCount,
  GoFishState,
} from './types'

export const GO_FISH_PLAYER_OPTIONS: {
  id: GoFishPlayerCount
  label: string
  hint: string
}[] = [
  { id: 2, label: '2 Players', hint: 'You vs. Barnaby Bear' },
  { id: 3, label: '3 Players', hint: 'You + 2 tablebots' },
  { id: 4, label: '4 Players', hint: 'Full cozy table' },
]

export const GO_FISH_DIFFICULTY_OPTIONS: {
  id: GoFishDifficulty
  label: string
  hint: string
}[] = [
  { id: 'gentle', label: 'Gentle', hint: 'Bots guess randomly — great for kids' },
  { id: 'clever', label: 'Clever', hint: 'Bots remember what you asked for' },
]

const BOT_ROSTER: Array<{ id: string; name: string; avatar: GoFishPlayer['avatar'] }> = [
  { id: 'bot-1', name: 'Barnaby Bear', avatar: 'bear' },
  { id: 'bot-2', name: 'Pip Fox', avatar: 'fox' },
  { id: 'bot-3', name: 'Tilly Owl', avatar: 'owl' },
]

export function getRankPlural(rank: Rank): string {
  const label = getRankLabel(rank)
  switch (label) {
    case 'A':
      return 'Aces'
    case '6':
      return 'Sixes'
    case 'J':
      return 'Jacks'
    case 'Q':
      return 'Queens'
    case 'K':
      return 'Kings'
    default:
      return `${label}s`
  }
}

export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Card['suit'], number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
  }
  return [...hand].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return suitOrder[a.suit] - suitOrder[b.suit]
  })
}

export function extractBooks(hand: Card[]): {
  remaining: Card[]
  newBooks: Rank[]
} {
  const byRank = new Map<Rank, Card[]>()
  for (const card of hand) {
    const list = byRank.get(card.rank)
    if (list) list.push(card)
    else byRank.set(card.rank, [card])
  }

  const newBooks: Rank[] = []
  const remaining: Card[] = []

  for (const [rank, cards] of byRank.entries()) {
    if (cards.length === 4) {
      newBooks.push(rank)
    } else {
      remaining.push(...cards)
    }
  }

  newBooks.sort((a, b) => a - b)
  return { remaining: sortHand(remaining), newBooks }
}

function replenishIfEmpty(
  players: GoFishPlayer[],
  pond: Card[]
): { players: GoFishPlayer[]; pond: Card[] } {
  const nextPond = [...pond]
  const nextPlayers = players.map((p) => {
    if (p.hand.length === 0 && nextPond.length > 0) {
      const drawn = nextPond.pop()!
      return {
        ...p,
        hand: sortHand([{ ...drawn, faceUp: p.isHuman }]),
      }
    }
    return p
  })
  return { players: nextPlayers, pond: nextPond }
}

export function isGoFishOver(state: GoFishState): boolean {
  const totalBooks = state.players.reduce((sum, p) => sum + p.books.length, 0)
  if (totalBooks >= 13) return true
  const anyoneHasCards = state.players.some((p) => p.hand.length > 0)
  return !anyoneHasCards && state.pond.length === 0
}

function findNextPlayerIndex(players: GoFishPlayer[], fromIndex: number): number {
  const count = players.length
  for (let offset = 1; offset <= count; offset++) {
    const idx = (fromIndex + offset) % count
    if (players[idx].hand.length > 0) {
      return idx
    }
  }
  return fromIndex
}

export function createGoFishGame(
  playerCount: GoFishPlayerCount = 3,
  difficulty: GoFishDifficulty = 'gentle',
  rng: () => number = Math.random
): GoFishState {
  const deck = shuffleDeck(createDeck(), rng)
  const cardsPerPlayer = playerCount === 2 ? 7 : 5

  const players: GoFishPlayer[] = [
    {
      id: 'human',
      name: 'You',
      avatar: 'you',
      isHuman: true,
      hand: [],
      books: [],
    },
    ...BOT_ROSTER.slice(0, playerCount - 1).map((bot) => ({
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      isHuman: false,
      hand: [],
      books: [],
    })),
  ]

  let cursor = 0
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < playerCount; p++) {
      const card = { ...deck[cursor++], faceUp: p === 0 }
      players[p].hand.push(card)
    }
  }

  for (let p = 0; p < playerCount; p++) {
    const { remaining, newBooks } = extractBooks(players[p].hand)
    players[p].hand = remaining
    players[p].books = newBooks
  }

  const pond = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }))
  const replenished = replenishIfEmpty(players, pond)

  return {
    players: replenished.players,
    pond: replenished.pond,
    currentPlayerIndex: 0,
    phase: 'human-pick',
    playerCount,
    difficulty,
    pendingRank: null,
    pendingTargetId: null,
    statusMessage: 'Your turn! Pick a card in your hand, then tap a friend to ask.',
    lastBubble: null,
    recentAsks: [],
    turns: 0,
  }
}

export interface AskOutcome {
  nextState: GoFishState
  gotCards: number
  newBooks: Rank[]
}

export function askForRank(
  state: GoFishState,
  targetId: string,
  rank: Rank
): AskOutcome {
  const asker = state.players[state.currentPlayerIndex]
  const targetIndex = state.players.findIndex((p) => p.id === targetId)

  if (
    targetIndex === -1 ||
    targetIndex === state.currentPlayerIndex ||
    !asker.hand.some((c) => c.rank === rank)
  ) {
    return { nextState: state, gotCards: 0, newBooks: [] }
  }

  const target = state.players[targetIndex]
  const matching = target.hand.filter((c) => c.rank === rank)
  const remainingTarget = target.hand.filter((c) => c.rank !== rank)

  const recentAsks = [
    ...state.recentAsks.filter((a) => !(a.playerId === asker.id && a.rank === rank)),
    { playerId: asker.id, rank },
  ].slice(-12)

  if (matching.length > 0) {
    const transferred = matching.map((c) => ({ ...c, faceUp: asker.isHuman }))
    const combined = [...asker.hand, ...transferred]
    const { remaining, newBooks } = extractBooks(combined)

    let nextPlayers = state.players.map((p, idx) => {
      if (idx === state.currentPlayerIndex) {
        return {
          ...p,
          hand: remaining,
          books: [...p.books, ...newBooks].sort((a, b) => a - b),
        }
      }
      if (idx === targetIndex) {
        return { ...p, hand: remainingTarget }
      }
      return p
    })

    const replenished = replenishIfEmpty(nextPlayers, state.pond)
    nextPlayers = replenished.players
    const nextPond = replenished.pond

    const plural = getRankPlural(rank)
    const bookText =
      newBooks.length > 0
        ? ` and made a Book of ${newBooks.map(getRankPlural).join(', ')}!`
        : '!'
    const countWord = matching.length === 1 ? '1' : `${matching.length}`

    const draftState: GoFishState = {
      ...state,
      players: nextPlayers,
      pond: nextPond,
      pendingRank: null,
      pendingTargetId: null,
      recentAsks,
      turns: state.turns + 1,
      lastBubble: {
        playerId: target.id,
        text: `Here ${matching.length === 1 ? 'is' : 'are'} ${countWord} ${
          matching.length === 1 ? getRankLabel(rank) : plural
        }!`,
      },
      statusMessage: `${asker.name} got ${countWord} ${
        matching.length === 1 ? getRankLabel(rank) : plural
      } from ${target.name}${bookText} ${
        asker.isHuman ? 'Go again!' : `${asker.name} goes again.`
      }`,
    }

    if (isGoFishOver(draftState)) {
      return {
        nextState: {
          ...draftState,
          phase: 'game-over',
          statusMessage: 'All 13 books are complete!',
        },
        gotCards: matching.length,
        newBooks,
      }
    }

    // If current player still has cards, they go again; otherwise advance turn
    if (nextPlayers[state.currentPlayerIndex].hand.length > 0) {
      return {
        nextState: {
          ...draftState,
          phase: asker.isHuman ? 'human-pick' : 'bot-turn',
        },
        gotCards: matching.length,
        newBooks,
      }
    }

    const nextIdx = findNextPlayerIndex(nextPlayers, state.currentPlayerIndex)
    return {
      nextState: {
        ...draftState,
        currentPlayerIndex: nextIdx,
        phase: nextPlayers[nextIdx].isHuman ? 'human-pick' : 'bot-turn',
      },
      gotCards: matching.length,
      newBooks,
    }
  }

  // Opponent didn't have the card -> Go Fish!
  if (asker.isHuman && state.pond.length > 0) {
    return {
      nextState: {
        ...state,
        phase: 'human-go-fish',
        pendingRank: rank,
        pendingTargetId: target.id,
        recentAsks,
        lastBubble: {
          playerId: target.id,
          text: `Go Fish! No ${getRankPlural(rank)} here.`,
        },
        statusMessage: `${target.name} says "Go Fish!" Tap the Pond to draw a card.`,
      },
      gotCards: 0,
      newBooks: [],
    }
  }

  // Bot Go Fish (or empty pond)
  return resolveGoFishDraw({
    ...state,
    pendingRank: rank,
    pendingTargetId: target.id,
    recentAsks,
    lastBubble: {
      playerId: target.id,
      text: `Go Fish!`,
    },
  })
}

export function resolveGoFishDraw(state: GoFishState): AskOutcome {
  const asker = state.players[state.currentPlayerIndex]
  const nextPond = [...state.pond]
  const drawn = nextPond.pop() ?? null
  const askedRank = state.pendingRank

  let nextPlayers = state.players
  let newBooks: Rank[] = []
  let luckyCatch = false

  if (drawn) {
    const faceUpCard: Card = { ...drawn, faceUp: asker.isHuman }
    const combined = [...asker.hand, faceUpCard]
    const extracted = extractBooks(combined)
    newBooks = extracted.newBooks
    luckyCatch = askedRank !== null && drawn.rank === askedRank

    nextPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? {
            ...p,
            hand: extracted.remaining,
            books: [...p.books, ...newBooks].sort((a, b) => a - b),
          }
        : p
    )
  }

  const replenished = replenishIfEmpty(nextPlayers, nextPond)
  nextPlayers = replenished.players
  const finalPond = replenished.pond

  const draftBase: GoFishState = {
    ...state,
    players: nextPlayers,
    pond: finalPond,
    pendingRank: null,
    pendingTargetId: null,
    turns: state.turns + 1,
  }

  if (isGoFishOver(draftBase)) {
    return {
      nextState: {
        ...draftBase,
        phase: 'game-over',
        statusMessage: 'All 13 books are complete!',
      },
      gotCards: drawn ? 1 : 0,
      newBooks,
    }
  }

  if (luckyCatch && nextPlayers[state.currentPlayerIndex].hand.length > 0 && askedRank !== null) {
    const bookSuffix =
      newBooks.length > 0
        ? ` and completed a Book of ${newBooks.map(getRankPlural).join(', ')}!`
        : '!'
    return {
      nextState: {
        ...draftBase,
        phase: asker.isHuman ? 'human-pick' : 'bot-turn',
        statusMessage: `Lucky catch! ${asker.name} drew the ${getRankLabel(
          askedRank
        )} from the Pond${bookSuffix} ${
          asker.isHuman ? 'Go again!' : `${asker.name} goes again.`
        }`,
      },
      gotCards: 1,
      newBooks,
    }
  }

  const nextIdx = findNextPlayerIndex(nextPlayers, state.currentPlayerIndex)
  const nextPlayer = nextPlayers[nextIdx]
  const bookNote =
    newBooks.length > 0
      ? ` (${asker.name} made a Book of ${newBooks.map(getRankPlural).join(', ')}!)`
      : ''

  return {
    nextState: {
      ...draftBase,
      currentPlayerIndex: nextIdx,
      phase: nextPlayer.isHuman ? 'human-pick' : 'bot-turn',
      statusMessage: nextPlayer.isHuman
        ? `${asker.name} went fishing${bookNote}. Your turn — pick a card & ask a friend!`
        : `${asker.name} went fishing${bookNote}. ${nextPlayer.name}'s turn...`,
    },
    gotCards: drawn ? 1 : 0,
    newBooks,
  }
}

export function chooseBotMove(
  state: GoFishState,
  rng: () => number = Math.random
): { targetId: string; rank: Rank } | null {
  const bot = state.players[state.currentPlayerIndex]
  if (!bot || bot.isHuman || bot.hand.length === 0) return null

  const opponents = state.players.filter(
    (p, idx) => idx !== state.currentPlayerIndex && p.hand.length > 0
  )
  if (opponents.length === 0) return null

  const heldRanks = Array.from(new Set(bot.hand.map((c) => c.rank)))

  if (state.difficulty === 'clever') {
    // 1. Check recent asks for any rank the bot also holds
    for (let i = state.recentAsks.length - 1; i >= 0; i--) {
      const hint = state.recentAsks[i]
      if (
        hint.playerId !== bot.id &&
        heldRanks.includes(hint.rank) &&
        opponents.some((o) => o.id === hint.playerId)
      ) {
        return { targetId: hint.playerId, rank: hint.rank }
      }
    }

    // 2. Otherwise prefer a rank the bot already has multiples of
    const counts = new Map<Rank, number>()
    for (const c of bot.hand) {
      counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
    }
    const sortedRanks = [...heldRanks].sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    )
    const rank = sortedRanks[0]
    const target = opponents[Math.floor(rng() * opponents.length)]
    return { targetId: target.id, rank }
  }

  // Gentle mode: random rank from hand + random opponent
  const rank = heldRanks[Math.floor(rng() * heldRanks.length)]
  const target = opponents[Math.floor(rng() * opponents.length)]
  return { targetId: target.id, rank }
}

export function getGoFishWinners(state: GoFishState): GoFishPlayer[] {
  const maxBooks = Math.max(...state.players.map((p) => p.books.length))
  return state.players.filter((p) => p.books.length === maxBooks)
}
