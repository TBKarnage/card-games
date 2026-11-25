import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Fish,
  Palette,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { PlayingCard } from '../../components/PlayingCard'
import type { CardBackId } from '../../config/appDefaults'
import { getRankLabel } from '../solitaire/engine'
import type { Rank } from '../solitaire/types'
import { soundFX } from '../../utils/audio'
import {
  askForRank,
  chooseBotMove,
  createGoFishGame,
  getGoFishWinners,
  getRankPlural,
  GO_FISH_DIFFICULTY_OPTIONS,
  GO_FISH_PLAYER_OPTIONS,
  resolveGoFishDraw,
} from './engine'
import type { GoFishDifficulty, GoFishPlayer, GoFishPlayerCount, GoFishState } from './types'

interface GoFishBoardProps {
  cardBackId: CardBackId
  largePrint: boolean
  soundEnabled: boolean
  onBackToHub: () => void
  onOpenCustomize: () => void
  onOpenSettings: () => void
  onToggleSound: () => void
  onRecordWin: (moves: number, seconds: number) => string[]
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function getAvatarEmoji(avatar: GoFishPlayer['avatar']): string {
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

export function GoFishBoard({
  cardBackId,
  largePrint,
  soundEnabled,
  onBackToHub,
  onOpenCustomize,
  onOpenSettings,
  onToggleSound,
  onRecordWin,
}: GoFishBoardProps) {
  const [playerCount, setPlayerCount] = useState<GoFishPlayerCount>(3)
  const [difficulty, setDifficulty] = useState<GoFishDifficulty>('gentle')
  const [draftPlayerCount, setDraftPlayerCount] = useState<GoFishPlayerCount>(3)
  const [draftDifficulty, setDraftDifficulty] = useState<GoFishDifficulty>('gentle')
  const [isSetupOpen, setIsSetupOpen] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const [game, setGame] = useState<GoFishState>(() => createGoFishGame(3, 'gentle'))
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([])

  const winRecordedRef = useRef(false)
  const humanPlayer = game.players[0]
  const opponents = game.players.slice(1)
  const totalBooks = game.players.reduce((sum, p) => sum + p.books.length, 0)
  const gameOver = game.phase === 'game-over'

  // Timer (paused while setup is open or game is over)
  useEffect(() => {
    if (gameOver || isSetupOpen) return
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameOver, isSetupOpen])

  const handleGameOverCheck = useCallback(
    (nextState: GoFishState) => {
      if (nextState.phase !== 'game-over' || winRecordedRef.current) return
      winRecordedRef.current = true
      const winners = getGoFishWinners(nextState)
      const humanWon = winners.some((w) => w.isHuman)
      if (humanWon) {
        soundFX.playWinFanfare()
        const unlocks = onRecordWin(nextState.turns, elapsedSeconds)
        setNewlyUnlocked(unlocks)
      } else {
        soundFX.playCardPlace()
      }
    },
    [elapsedSeconds, onRecordWin]
  )

  // Bot turn automation
  useEffect(() => {
    if (isSetupOpen || game.phase !== 'bot-turn') return

    const id = window.setTimeout(() => {
      const move = chooseBotMove(game)
      if (!move) return
      const outcome = askForRank(game, move.targetId, move.rank)
      if (outcome.gotCards > 0) {
        soundFX.playCardSnap()
      } else {
        soundFX.playCardFlip()
      }
      setGame(outcome.nextState)
      handleGameOverCheck(outcome.nextState)
    }, 950)

    return () => window.clearTimeout(id)
  }, [game, isSetupOpen, handleGameOverCheck])

  const startNewDeal = useCallback(
    (
      nextCount: GoFishPlayerCount = playerCount,
      nextDiff: GoFishDifficulty = difficulty
    ) => {
      soundFX.playCardFlip()
      winRecordedRef.current = false
      setNewlyUnlocked([])
      setSelectedRank(null)
      setElapsedSeconds(0)
      setPlayerCount(nextCount)
      setDifficulty(nextDiff)
      setGame(createGoFishGame(nextCount, nextDiff))
      setHasStarted(true)
      setIsSetupOpen(false)
    },
    [playerCount, difficulty]
  )

  const openSetupMenu = () => {
    soundFX.playButtonTap()
    setDraftPlayerCount(playerCount)
    setDraftDifficulty(difficulty)
    setIsSetupOpen(true)
  }

  const handleSelectCard = (rank: Rank) => {
    if (game.phase !== 'human-pick' || isSetupOpen) return
    soundFX.playButtonTap()
    setSelectedRank((prev) => (prev === rank ? null : rank))
  }

  const handleAskOpponent = (targetId: string) => {
    if (game.phase !== 'human-pick' || selectedRank === null || isSetupOpen) return
    const target = game.players.find((p) => p.id === targetId)
    if (!target || target.hand.length === 0) return

    const outcome = askForRank(game, targetId, selectedRank)
    if (outcome.gotCards > 0) {
      soundFX.playCardSnap()
    } else {
      soundFX.playCardError()
    }
    setSelectedRank(null)
    setGame(outcome.nextState)
    handleGameOverCheck(outcome.nextState)
  }

  const handleDrawFromPond = () => {
    if (game.phase !== 'human-go-fish' || isSetupOpen) return
    soundFX.playCardFlip()
    const outcome = resolveGoFishDraw(game)
    if (outcome.newBooks.length > 0) {
      soundFX.playCardSnap()
    }
    setGame(outcome.nextState)
    handleGameOverCheck(outcome.nextState)
  }

  const singleActiveOpponent = useMemo(() => {
    const active = opponents.filter((o) => o.hand.length > 0)
    return active.length === 1 ? active[0] : null
  }, [opponents])

  const winners = useMemo(() => (gameOver ? getGoFishWinners(game) : []), [gameOver, game])
  const resultHeading = useMemo(() => {
    if (!gameOver) return ''
    const humanWon = winners.some((w) => w.isHuman)
    if (humanWon && winners.length === 1) return 'You Won the Pond!'
    if (humanWon) return "It's a Cozy Tie!"
    return `${winners[0]?.name ?? 'A Tablebot'} Won!`
  }, [gameOver, winners])

  const difficultyLabel = difficulty === 'gentle' ? 'Gentle' : 'Clever'

  return (
    <div className="gofish-shell">
      {/* Top HUD */}
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
            onClick={() => startNewDeal(playerCount, difficulty)}
            title="New Deal"
          >
            <RotateCcw size={17} />
            <span className="hud-label">New Deal</span>
          </button>

          <button
            type="button"
            className="draw-pill"
            onClick={openSetupMenu}
            title="Customize players & bot smarts"
          >
            <SlidersHorizontal size={14} />
            <span>
              {playerCount}P • {difficultyLabel}
            </span>
          </button>
        </div>

        <div className="hud-center">
          <div className="hud-stat">
            <span>Books</span>
            <strong>{totalBooks}/13</strong>
          </div>
          <div className="hud-stat">
            <span>Pond</span>
            <strong>{game.pond.length}</strong>
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

      <main className="gofish-board">
        {/* Opponents Row */}
        <section className="gofish-opponents" aria-label="Tablebots">
          {opponents.map((bot) => {
            const isTurn = game.players[game.currentPlayerIndex]?.id === bot.id && !gameOver
            const canAsk =
              game.phase === 'human-pick' && selectedRank !== null && bot.hand.length > 0
            const bubble =
              game.lastBubble?.playerId === bot.id ? game.lastBubble.text : null
            const visibleBacks = Math.min(bot.hand.length, 5)

            return (
              <button
                key={bot.id}
                type="button"
                disabled={!canAsk}
                onClick={() => handleAskOpponent(bot.id)}
                className={`gofish-bot-card ${isTurn ? 'is-turn' : ''} ${
                  canAsk ? 'is-targetable' : ''
                }`}
              >
                {bubble && <div className="gofish-bubble">{bubble}</div>}

                <div className="gofish-bot-header">
                  <span className="gofish-bot-avatar" aria-hidden="true">
                    {getAvatarEmoji(bot.avatar)}
                  </span>
                  <div className="gofish-bot-meta">
                    <strong>{bot.name}</strong>
                    <small>
                      {bot.books.length} {bot.books.length === 1 ? 'Book' : 'Books'} •{' '}
                      {bot.hand.length} {bot.hand.length === 1 ? 'card' : 'cards'}
                    </small>
                  </div>
                </div>

                <div className="gofish-bot-backs" aria-hidden="true">
                  {Array.from({ length: visibleBacks }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`gofish-mini-back card-back--${cardBackId}`}
                    />
                  ))}
                  {bot.hand.length === 0 && (
                    <span className="gofish-empty-hand">Out of cards</span>
                  )}
                </div>

                {canAsk && selectedRank !== null && (
                  <span className="gofish-ask-pill">
                    Ask for {getRankPlural(selectedRank)}
                  </span>
                )}
              </button>
            )
          })}
        </section>

        {/* Center Pond & Status */}
        <section className="gofish-center">
          <div className="gofish-status-banner" role="status">
            <Fish size={16} />
            <span>{game.statusMessage}</span>
          </div>

          <div className="gofish-pond-area">
            <button
              type="button"
              onClick={handleDrawFromPond}
              disabled={game.phase !== 'human-go-fish'}
              className={`gofish-pond-btn ${
                game.phase === 'human-go-fish' ? 'is-fishing' : ''
              }`}
              aria-label={
                game.phase === 'human-go-fish'
                  ? `Go Fish! Tap to draw a card (${game.pond.length} left)`
                  : `Pond (${game.pond.length} cards left)`
              }
            >
              {game.pond.length > 0 ? (
                <div className="stock-stack">
                  <PlayingCard
                    card={{ ...game.pond[game.pond.length - 1], faceUp: false }}
                    cardBackId={cardBackId}
                    hinted={game.phase === 'human-go-fish'}
                  />
                  <span className="stock-count">{game.pond.length}</span>
                </div>
              ) : (
                <div className="empty-slot-mark">Pond Empty</div>
              )}
            </button>

            {game.phase === 'human-go-fish' && (
              <button
                type="button"
                className="btn-primary gofish-draw-cta"
                onClick={handleDrawFromPond}
              >
                <Fish size={17} />
                <span>Go Fish! Draw a Card</span>
              </button>
            )}

            {game.phase === 'human-pick' &&
              selectedRank !== null &&
              singleActiveOpponent && (
                <button
                  type="button"
                  className="btn-primary gofish-draw-cta"
                  onClick={() => handleAskOpponent(singleActiveOpponent.id)}
                >
                  <span>
                    Ask {singleActiveOpponent.name} for {getRankPlural(selectedRank)}
                  </span>
                </button>
              )}
          </div>
        </section>

        {/* Human Player Hand & Books */}
        <section className="gofish-player-zone" aria-label="Your hand and books">
          <div className="gofish-player-bar">
            <div className="gofish-player-title">
              <strong>Your Hand</strong>
              <span>
                {game.phase === 'human-pick'
                  ? selectedRank !== null
                    ? `Selected ${getRankLabel(selectedRank)} — tap a friend above!`
                    : 'Tap any card to pick a rank'
                  : game.phase === 'human-go-fish'
                  ? 'Tap the Pond to Go Fish!'
                  : 'Waiting for tablebots...'}
              </span>
            </div>

            <div className="gofish-books-strip" aria-label="Your completed books">
              <span className="gofish-books-label">
                Your Books ({humanPlayer.books.length}):
              </span>
              {humanPlayer.books.length === 0 ? (
                <span className="gofish-books-none">None yet</span>
              ) : (
                humanPlayer.books.map((rank) => (
                  <span key={rank} className="gofish-book-badge">
                    {getRankLabel(rank)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="gofish-hand-row">
            {humanPlayer.hand.map((card) => {
              const isSelected = selectedRank === card.rank
              return (
                <div key={card.id} className="gofish-hand-card-wrap">
                  <PlayingCard
                    card={card}
                    cardBackId={cardBackId}
                    largePrint={largePrint}
                    selected={isSelected}
                    onClick={() => handleSelectCard(card.rank)}
                  />
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Pre-game Setup Modal */}
      {isSetupOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Cozy Go Fish Setup"
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Cozy Go Fish Setup</h2>
                <p className="modal-subtitle">
                  Choose how many friends are at the table and how clever the bots play.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  soundFX.playButtonTap()
                  if (hasStarted) {
                    setIsSetupOpen(false)
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
                <div className="memory-setup-grid memory-setup-grid--3">
                  {GO_FISH_PLAYER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option memory-setup-option--stack ${
                        draftPlayerCount === opt.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        soundFX.playButtonTap()
                        setDraftPlayerCount(opt.id)
                      }}
                    >
                      <div className="memory-setup-icon">
                        <Users size={20} />
                      </div>
                      <div className="memory-setup-text">
                        <strong>{opt.label}</strong>
                        <span>{opt.hint}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="customize-section">
                <h3>Tablebot Smarts</h3>
                <div className="memory-setup-grid memory-setup-grid--2">
                  {GO_FISH_DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option ${
                        draftDifficulty === opt.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        soundFX.playButtonTap()
                        setDraftDifficulty(opt.id)
                      }}
                    >
                      <div className="memory-setup-icon">
                        <Sparkles size={20} />
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
                  onClick={() => startNewDeal(draftPlayerCount, draftDifficulty)}
                >
                  <Play size={18} fill="currentColor" />
                  <span>Deal &amp; Play</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    soundFX.playButtonTap()
                    if (hasStarted) {
                      setIsSetupOpen(false)
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

      {/* Game Over Modal */}
      {gameOver && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Go Fish Complete"
        >
          <div className="modal-card win-card">
            <div className="win-trophy">
              <Trophy size={40} />
            </div>
            <h2>{resultHeading}</h2>
            <p className="modal-subtitle">
              All 13 books of four have been gathered from the pond!
            </p>

            <div className="gofish-standings">
              {[...game.players]
                .sort((a, b) => b.books.length - a.books.length)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`gofish-standing-row ${
                      winners.some((w) => w.id === p.id) ? 'is-winner' : ''
                    }`}
                  >
                    <span>
                      {getAvatarEmoji(p.avatar)} {p.name}
                    </span>
                    <strong>
                      {p.books.length} {p.books.length === 1 ? 'Book' : 'Books'}
                    </strong>
                  </div>
                ))}
            </div>

            {newlyUnlocked.length > 0 && (
              <div className="unlock-banner">
                <Sparkles size={16} />
                <span>Unlocked: {newlyUnlocked.join(', ')}!</span>
              </div>
            )}

            <div className="win-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => startNewDeal(playerCount, difficulty)}
              >
                Play Again
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={openSetupMenu}
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
