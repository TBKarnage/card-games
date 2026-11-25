import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  Layers,
  Palette,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { PlayingCard } from '../../components/PlayingCard'
import { soundFX } from '../../utils/audio'
import { getRankLabel } from '../solitaire/engine'
import {
  TRASH_MODE_OPTIONS,
  createTrashGame,
  discardActiveTrashCard,
  drawFromTrashPile,
  getValidSlotIndices,
  placeTrashCardInSlot,
  startNextTrashRound,
  stepBotTrashTurn,
} from './engine'
import type { TrashMatchMode, TrashPlayerCount, TrashState } from './types'

interface TrashBoardProps {
  cardBackId: Parameters<typeof PlayingCard>[0]['cardBackId']
  largePrint: boolean
  soundEnabled: boolean
  onBackToHub: () => void
  onOpenCustomize: () => void
  onOpenSettings: () => void
  onToggleSound: () => void
  onRecordWin: (moves: number, elapsedSeconds: number) => string[]
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function getAvatarEmoji(avatar: 'you' | 'bear' | 'fox' | 'owl'): string {
  switch (avatar) {
    case 'bear':
      return '🐻'
    case 'fox':
      return '🦊'
    case 'owl':
      return '🦉'
    default:
      return '😊'
  }
}

export function TrashBoard({
  cardBackId,
  largePrint,
  soundEnabled,
  onBackToHub,
  onOpenCustomize,
  onOpenSettings,
  onToggleSound,
  onRecordWin,
}: TrashBoardProps) {
  const [playerCount, setPlayerCount] = useState<TrashPlayerCount>(2)
  const [humanCount, setHumanCount] = useState<1 | 2>(1)
  const [matchMode, setMatchMode] = useState<TrashMatchMode>('quick')
  const [draftPlayers, setDraftPlayers] = useState<TrashPlayerCount>(2)
  const [draftHumanCount, setDraftHumanCount] = useState<1 | 2>(1)
  const [draftMode, setDraftMode] = useState<TrashMatchMode>('quick')
  const [showSetup, setShowSetup] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const [gameState, setGameState] = useState<TrashState>(() =>
    createTrashGame(2, 'quick', Math.random, 1)
  )
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [newUnlocks, setNewUnlocks] = useState<string[]>([])
  const winRecordedRef = useRef(false)

  const activeHuman = useMemo(() => {
    const curr = gameState.players[gameState.currentPlayerIndex]
    if (curr?.isHuman) return curr
    return gameState.players.find((p) => p.isHuman) ?? gameState.players[0]
  }, [gameState.players, gameState.currentPlayerIndex])
  const opponents = useMemo(
    () => gameState.players.filter((p) => p.id !== activeHuman.id),
    [gameState.players, activeHuman.id]
  )
  const isRoundOver = gameState.phase === 'round-over'
  const isGameOver = gameState.phase === 'game-over'

  useEffect(() => {
    if (isGameOver || isRoundOver || showSetup) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isGameOver, isRoundOver, showSetup])

  const handleGameOverCheck = useCallback(
    (nextState: TrashState) => {
      if (nextState.phase !== 'game-over' || winRecordedRef.current) return
      winRecordedRef.current = true
      const humanWon = nextState.players.some(
        (p) => p.isHuman && p.roundsWon >= nextState.targetRounds
      )
      if (humanWon) {
        soundFX.playWinFanfare()
        const unlocked = onRecordWin(nextState.turns, elapsedSeconds)
        setNewUnlocks(unlocked)
      } else {
        soundFX.playCardPlace()
      }
    },
    [elapsedSeconds, onRecordWin]
  )

  useEffect(() => {
    if (showSetup || gameState.phase !== 'bot-turn') return
    const timer = window.setTimeout(() => {
      const next = stepBotTrashTurn(gameState)
      if (next.phase === 'human-draw') {
        soundFX.playCardPlace()
      } else if (next.activeCard) {
        soundFX.playCardFlip()
      }
      setGameState(next)
      handleGameOverCheck(next)
    }, 750)
    return () => window.clearTimeout(timer)
  }, [gameState, showSetup, handleGameOverCheck])

  const startNewGame = useCallback(
    (
      nextPlayers: TrashPlayerCount = playerCount,
      nextMode: TrashMatchMode = matchMode,
      nextHumans: 1 | 2 = humanCount
    ) => {
      soundFX.playCardFlip()
      winRecordedRef.current = false
      setNewUnlocks([])
      setElapsedSeconds(0)
      setPlayerCount(nextPlayers)
      setHumanCount(nextHumans)
      setMatchMode(nextMode)
      setGameState(createTrashGame(nextPlayers, nextMode, Math.random, nextHumans))
      setHasStarted(true)
      setShowSetup(false)
    },
    [playerCount, matchMode, humanCount]
  )

  const openSetupModal = () => {
    soundFX.playButtonTap()
    setDraftPlayers(playerCount)
    setDraftHumanCount(humanCount)
    setDraftMode(matchMode)
    setShowSetup(true)
  }

  const validHumanSlots = useMemo(() => {
    if (gameState.phase !== 'human-place' || !gameState.activeCard) return []
    return getValidSlotIndices(activeHuman.slots, gameState.activeCard)
  }, [gameState.phase, gameState.activeCard, activeHuman.slots])

  const canDiscardHuman =
    gameState.phase === 'human-place' &&
    gameState.activeCard !== null &&
    validHumanSlots.length === 0

  const handleDraw = (source: 'stock' | 'discard') => {
    if (gameState.phase !== 'human-draw' || showSetup) return
    soundFX.playCardFlip()
    const next = drawFromTrashPile(gameState, source)
    setGameState(next)
  }

  const handlePlaceInSlot = (slotIdx: number) => {
    if (gameState.phase !== 'human-place' || showSetup) return
    if (!validHumanSlots.includes(slotIdx)) {
      soundFX.playCardError()
      return
    }
    soundFX.playCardSnap()
    const next = placeTrashCardInSlot(gameState, slotIdx)
    setGameState(next)
    handleGameOverCheck(next)
  }

  const handleDiscard = () => {
    if (!canDiscardHuman || showSetup) return
    soundFX.playCardPlace()
    const next = discardActiveTrashCard(gameState)
    setGameState(next)
  }

  const handleNextRound = () => {
    soundFX.playCardFlip()
    setGameState((prev) => startNextTrashRound(prev))
  }

  const topDiscard =
    gameState.discardPile.length > 0
      ? gameState.discardPile[gameState.discardPile.length - 1]
      : null

  const matchWinner = useMemo(() => {
    if (!isGameOver) return null
    return [...gameState.players].sort((a, b) => b.roundsWon - a.roundsWon)[0]
  }, [isGameOver, gameState.players])

  return (
    <div className="trash-shell">
      <header className="game-hud">
        <div className="hud-left">
          <button
            type="button"
            className="hud-btn"
            onClick={() => {
              soundFX.playButtonTap()
              onBackToHub()
            }}
            aria-label="Back to Card Table Hub"
          >
            <ArrowLeft size={18} />
            <span className="hud-label">Games</span>
          </button>

          <button
            type="button"
            className="hud-btn"
            onClick={() => startNewGame(playerCount, matchMode, humanCount)}
            title="New Deal"
          >
            <RotateCcw size={17} />
            <span className="hud-label">New Deal</span>
          </button>

          <button
            type="button"
            className="draw-pill"
            onClick={openSetupModal}
            title="Customize players & match length"
          >
            <SlidersHorizontal size={14} />
            <span>
              {humanCount === 2 ? '2P Pass & Play' : `${playerCount}P`} •{' '}
              {matchMode === 'classic' ? 'First to 3' : 'Quick'}
            </span>
          </button>
        </div>

        <div className="hud-center">
          <div className="hud-stat">
            <span>Round</span>
            <strong>
              {gameState.roundNumber}
              {gameState.targetRounds > 1 ? `/${gameState.targetRounds}` : ''}
            </strong>
          </div>
          <div className="hud-stat">
            <span>Deck</span>
            <strong>{gameState.stock.length}</strong>
          </div>
          <div className="hud-stat">
            <span>Time</span>
            <strong>{formatTime(elapsedSeconds)}</strong>
          </div>
        </div>

        <div className="hud-right">
          <button
            type="button"
            className="icon-btn icon-btn--glass"
            onClick={() => {
              soundFX.playButtonTap()
              onOpenCustomize()
            }}
            aria-label="Customize table"
            title="Customize"
          >
            <Palette size={18} />
          </button>

          <button
            type="button"
            className="icon-btn icon-btn--glass"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            type="button"
            className="icon-btn icon-btn--glass"
            onClick={() => {
              soundFX.playButtonTap()
              onOpenSettings()
            }}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="trash-board">
        <section className="trash-opponents" aria-label="Tablebots">
          {opponents.map((bot) => {
            const isBotTurn =
              gameState.players[gameState.currentPlayerIndex]?.id === bot.id &&
              !isGameOver &&
              !isRoundOver
            const revealedCount = bot.slots.filter((s) => s.revealed).length
            return (
              <div
                key={bot.id}
                className={`trash-bot-card ${isBotTurn ? 'is-turn' : ''}`}
              >
                <div className="trash-bot-header">
                  <span className="trash-bot-avatar" aria-hidden="true">
                    {getAvatarEmoji(bot.avatar)}
                  </span>
                  <div className="trash-bot-meta">
                    <strong>{bot.name}</strong>
                    <small>
                      {revealedCount}/10 slots
                      {gameState.targetRounds > 1
                        ? ` • ${bot.roundsWon}W`
                        : ''}
                    </small>
                  </div>
                </div>
                <div className="trash-bot-mini-grid" aria-hidden="true">
                  {bot.slots.map((slot) => (
                    <span
                      key={slot.slotNumber}
                      className={`trash-mini-slot ${slot.revealed ? 'is-open' : ''}`}
                    >
                      {slot.revealed ? getRankLabel(slot.card.rank) : slot.slotNumber}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        <section className="trash-center">
          <div className="gofish-status-banner" role="status">
            <Trash2 size={16} />
            <span>{gameState.statusMessage}</span>
          </div>

          <div className="trash-piles-row">
            <div className="trash-pile-col">
              <span className="trash-pile-label">Draw Pile</span>
              <button
                type="button"
                onClick={() => handleDraw('stock')}
                disabled={gameState.phase !== 'human-draw'}
                className={`trash-pile-btn ${
                  gameState.phase === 'human-draw' ? 'is-clickable' : ''
                }`}
                aria-label={`Draw from deck (${gameState.stock.length} cards left)`}
              >
                <div className="stock-stack">
                  <PlayingCard
                    card={{
                      id: 'trash-stock-top',
                      suit: 'spades',
                      rank: 1,
                      faceUp: false,
                    }}
                    cardBackId={cardBackId}
                    hinted={gameState.phase === 'human-draw'}
                  />
                  <span className="stock-count">{gameState.stock.length}</span>
                </div>
              </button>
            </div>

            {gameState.activeCard && (
              <div className="trash-pile-col">
                <span className="trash-pile-label">In Hand</span>
                <div className="trash-active-card-wrap">
                  <PlayingCard
                    card={gameState.activeCard}
                    cardBackId={cardBackId}
                    largePrint={largePrint}
                    selected
                  />
                </div>
              </div>
            )}

            <div className="trash-pile-col">
              <span className="trash-pile-label">
                {canDiscardHuman ? 'Tap to Discard' : 'Discard Pile'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (gameState.phase === 'human-draw' && topDiscard) {
                    handleDraw('discard')
                  } else if (canDiscardHuman) {
                    handleDiscard()
                  }
                }}
                disabled={
                  !(gameState.phase === 'human-draw' && topDiscard !== null) &&
                  !canDiscardHuman
                }
                className={`trash-pile-btn ${
                  (gameState.phase === 'human-draw' && topDiscard) || canDiscardHuman
                    ? 'is-clickable'
                    : ''
                }`}
                aria-label={
                  canDiscardHuman
                    ? 'Discard card to end turn'
                    : topDiscard
                      ? `Take ${getRankLabel(topDiscard.rank)} from discard pile`
                      : 'Empty discard pile'
                }
              >
                {topDiscard ? (
                  <PlayingCard
                    card={topDiscard}
                    cardBackId={cardBackId}
                    largePrint={largePrint}
                    hinted={canDiscardHuman}
                  />
                ) : (
                  <div className="empty-slot-mark">Empty</div>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="trash-player-zone" aria-label="Active player 10-card layout">
          <div className="trash-player-header">
            <strong>
              {humanCount === 2 ? `${activeHuman.name}'s Cards` : 'Your Cards'} (
              {activeHuman.slots.filter((s) => s.revealed).length}/10)
            </strong>
            <span>Jacks are Wild • Queens & Kings are Trash</span>
          </div>

          <div className="trash-slots-grid">
            {activeHuman.slots.map((slot, idx) => {
              const isValidTarget = validHumanSlots.includes(idx)
              return (
                <button
                  key={slot.slotNumber}
                  type="button"
                  onClick={() => handlePlaceInSlot(idx)}
                  disabled={!isValidTarget}
                  className={`trash-slot-btn ${isValidTarget ? 'is-valid-target' : ''}`}
                  aria-label={`Slot ${slot.slotNumber}: ${
                    slot.revealed
                      ? `${getRankLabel(slot.card.rank)} face up`
                      : 'face down'
                  }`}
                >
                  <span className="trash-slot-num">{slot.slotNumber}</span>
                  <PlayingCard
                    card={slot.card}
                    cardBackId={cardBackId}
                    largePrint={largePrint}
                    hinted={isValidTarget}
                  />
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {showSetup && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Trash / Garbage Setup"
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Trash / Garbage Setup</h2>
                <p className="modal-subtitle">
                  Fill slots 1–10 first! Play with a friend on one screen or against tablebots.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  soundFX.playButtonTap()
                  if (hasStarted) {
                    setShowSetup(false)
                  } else {
                    onBackToHub()
                  }
                }}
                aria-label={hasStarted ? 'Close setup' : 'Back to games'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <section className="customize-section">
                <h3>Players at the Table</h3>
                <div className="memory-setup-grid memory-setup-grid--2">
                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayers === 2 && draftHumanCount === 2 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayers(2)
                      setDraftHumanCount(2)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <Users size={20} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>2 Players (2 Humans)</strong>
                      <span>Pass &amp; play on one screen</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayers === 2 && draftHumanCount === 1 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayers(2)
                      setDraftHumanCount(1)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <Bot size={20} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>2 Players (vs Robot)</strong>
                      <span>You vs. Barnaby Bear</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayers === 3 && draftHumanCount === 1 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayers(3)
                      setDraftHumanCount(1)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <Bot size={20} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>3 Players (vs Robots)</strong>
                      <span>You + 2 tablebots</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayers === 4 && draftHumanCount === 1 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayers(4)
                      setDraftHumanCount(1)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <Bot size={20} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>4 Players (vs Robots)</strong>
                      <span>Full cozy table</span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="customize-section">
                <h3>Match Length</h3>
                <div className="memory-setup-grid memory-setup-grid--2">
                  {TRASH_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option ${
                        draftMode === opt.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        soundFX.playButtonTap()
                        setDraftMode(opt.id)
                      }}
                    >
                      <div className="memory-setup-icon">
                        <Layers size={20} />
                      </div>
                      <div className="memory-setup-text">
                        <strong>{opt.label}</strong>
                        <span>{opt.hint}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="memory-setup-actions">
                <button
                  type="button"
                  className="btn-primary memory-setup-start"
                  onClick={() => startNewGame(draftPlayers, draftMode, draftHumanCount)}
                >
                  <Play size={18} fill="currentColor" />
                  <span>Deal & Play</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    soundFX.playButtonTap()
                    if (hasStarted) {
                      setShowSetup(false)
                    } else {
                      onBackToHub()
                    }
                  }}
                >
                  {hasStarted ? 'Keep Playing' : 'Back to Games'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRoundOver && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Round Complete"
        >
          <div className="modal-card win-card">
            <div className="win-trophy">
              <Sparkles size={38} />
            </div>
            <h2>Round {gameState.roundNumber} Complete!</h2>
            <p className="modal-subtitle">{gameState.statusMessage}</p>
            <div className="gofish-standings">
              {gameState.players.map((p) => (
                <div key={p.id} className="gofish-standing-row">
                  <span>
                    {getAvatarEmoji(p.avatar)} {p.name}
                  </span>
                  <strong>
                    {p.roundsWon}/{gameState.targetRounds} Rounds
                  </strong>
                </div>
              ))}
            </div>
            <div className="win-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextRound}
              >
                Next Round
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Trash Complete"
        >
          <div className="modal-card win-card">
            <div className="win-trophy">
              <Trophy size={40} />
            </div>
            <h2>
              {humanCount === 2
                ? `${matchWinner?.name ?? 'Player'} Cleared the Trash!`
                : matchWinner?.isHuman
                  ? 'You Cleared the Trash!'
                  : `${matchWinner?.name ?? 'A Tablebot'} Won!`}
            </h2>
            <p className="modal-subtitle">
              All 10 slots flipped face-up from Ace to 10!
            </p>

            <div className="gofish-standings">
              {[...gameState.players]
                .sort((a, b) => b.roundsWon - a.roundsWon)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`gofish-standing-row ${
                      p.id === matchWinner?.id ? 'is-winner' : ''
                    }`}
                  >
                    <span>
                      {getAvatarEmoji(p.avatar)} {p.name}
                    </span>
                    <strong>
                      {p.roundsWon} {p.roundsWon === 1 ? 'Win' : 'Wins'}
                    </strong>
                  </div>
                ))}
            </div>

            {newUnlocks.length > 0 && (
              <div className="unlock-banner">
                <Sparkles size={16} />
                <span>Unlocked: {newUnlocks.join(', ')}!</span>
              </div>
            )}

            <div className="win-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => startNewGame(playerCount, matchMode, humanCount)}
              >
                Play Again
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={openSetupModal}
              >
                Change Setup
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  soundFX.playButtonTap()
                  onBackToHub()
                }}
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
