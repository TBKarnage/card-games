import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Grid2x2,
  Palette,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { CardBackId } from '../../config/appDefaults'
import { soundFX } from '../../utils/audio'
import {
  createMemoryGame,
  flipMemoryCard,
  getPairCount,
  isMemoryWon,
  MEMORY_GRID_OPTIONS,
  resolveMismatch,
} from './engine'
import { MemoryIllustration } from './MemoryIllustration'
import type { MemoryGameState, MemoryGridSize, MemoryPlayerMode } from './types'

interface MemoryBoardProps {
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

export function MemoryBoard({
  cardBackId,
  largePrint,
  soundEnabled,
  onBackToHub,
  onOpenCustomize,
  onOpenSettings,
  onToggleSound,
  onRecordWin,
}: MemoryBoardProps) {
  const [gridSize, setGridSize] = useState<MemoryGridSize>('3x4')
  const [playerMode, setPlayerMode] = useState<MemoryPlayerMode>(1)
  const [draftGridSize, setDraftGridSize] = useState<MemoryGridSize>('3x4')
  const [draftPlayerMode, setDraftPlayerMode] = useState<MemoryPlayerMode>(1)
  const [isSetupOpen, setIsSetupOpen] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [game, setGame] = useState<MemoryGameState>(() =>
    createMemoryGame('3x4', 1)
  )
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([])

  const winRecordedRef = useRef(false)
  const won = useMemo(() => isMemoryWon(game), [game])
  const totalPairs = getPairCount(gridSize)
  const matchedPairs = game.scores[0] + game.scores[1]

  // Timer (paused while pre-game setup modal is open or game is won)
  useEffect(() => {
    if (won || isSetupOpen) return
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [won, isSetupOpen])

  // Record win once
  useEffect(() => {
    if (won && !winRecordedRef.current) {
      winRecordedRef.current = true
      soundFX.playWinFanfare()
      const unlocks = onRecordWin(game.moves, elapsedSeconds)
      setNewlyUnlocked(unlocks)
    }
  }, [won, game.moves, elapsedSeconds, onRecordWin])

  // Auto-flip back mismatched pair after a friendly pause
  useEffect(() => {
    if (!game.isResolvingMismatch) return
    const id = window.setTimeout(() => {
      soundFX.playCardPlace()
      setGame((prev) => resolveMismatch(prev))
    }, 850)
    return () => window.clearTimeout(id)
  }, [game.isResolvingMismatch])

  const startNewDeal = useCallback(
    (nextGrid: MemoryGridSize = gridSize, nextPlayers: MemoryPlayerMode = playerMode) => {
      soundFX.playCardFlip()
      winRecordedRef.current = false
      setNewlyUnlocked([])
      setElapsedSeconds(0)
      setGridSize(nextGrid)
      setPlayerMode(nextPlayers)
      setGame(createMemoryGame(nextGrid, nextPlayers))
      setHasStarted(true)
      setIsSetupOpen(false)
    },
    [gridSize, playerMode]
  )

  const openSetupMenu = () => {
    soundFX.playButtonTap()
    setDraftGridSize(gridSize)
    setDraftPlayerMode(playerMode)
    setIsSetupOpen(true)
  }

  const handleCardTap = (cardId: string) => {
    if (won || isSetupOpen || game.isResolvingMismatch) return
    const result = flipMemoryCard(game, cardId)
    if (result.outcome === 'ignored') return

    setGame(result.nextState)
    if (result.outcome === 'first-flip') {
      soundFX.playCardFlip()
    } else if (result.outcome === 'match') {
      soundFX.playCardSnap()
    } else if (result.outcome === 'mismatch') {
      soundFX.playCardError()
    }
  }

  const gridLabel =
    MEMORY_GRID_OPTIONS.find((opt) => opt.id === gridSize)?.label ?? 'Cozy (3×4)'

  const winHeadline = useMemo(() => {
    if (playerMode === 1) return 'Every Pair Found!'
    if (game.scores[0] > game.scores[1]) return 'Player 1 Wins!'
    if (game.scores[1] > game.scores[0]) return 'Player 2 Wins!'
    return "It's a Cozy Tie!"
  }, [playerMode, game.scores])

  return (
    <div className="memory-shell">
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
            onClick={() => startNewDeal(gridSize, playerMode)}
            title="New Game"
          >
            <RotateCcw size={17} />
            <span className="hud-label">New Deal</span>
          </button>

          <button
            type="button"
            className="draw-pill"
            onClick={openSetupMenu}
            title="Customize board size & player count"
          >
            <SlidersHorizontal size={14} />
            <span>
              {gridLabel} • {playerMode}P
            </span>
          </button>
        </div>

        <div className="hud-center">
          {playerMode === 2 ? (
            <div className="memory-players-hud">
              <div
                className={`player-turn-pill ${
                  game.currentPlayer === 1 ? 'is-active' : ''
                }`}
              >
                <span>P1</span>
                <strong>{game.scores[0]}</strong>
              </div>
              <div
                className={`player-turn-pill ${
                  game.currentPlayer === 2 ? 'is-active' : ''
                }`}
              >
                <span>P2</span>
                <strong>{game.scores[1]}</strong>
              </div>
            </div>
          ) : (
            <>
              <div className="hud-stat">
                <span>Pairs</span>
                <strong>
                  {matchedPairs}/{totalPairs}
                </strong>
              </div>
              <div className="hud-stat">
                <span>Moves</span>
                <strong>{game.moves}</strong>
              </div>
              <div className="hud-stat">
                <span>Time</span>
                <strong>{formatTime(elapsedSeconds)}</strong>
              </div>
            </>
          )}
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

      <main className="memory-board">
        {playerMode === 2 && !won && (
          <div className="memory-turn-banner" role="status">
            Player {game.currentPlayer}&apos;s turn — find a matching pair!
          </div>
        )}

        <div className={`memory-grid memory-grid--${gridSize}`}>
          {game.cards.map((card) => {
            const revealed = card.faceUp || card.matched
            return (
              <button
                key={card.id}
                type="button"
                className={`memory-card-tile ${revealed ? 'is-revealed' : ''} ${
                  card.matched ? 'is-matched' : ''
                } ${largePrint ? 'is-large-print' : ''}`}
                onClick={() => handleCardTap(card.id)}
                disabled={revealed || game.isResolvingMismatch}
                aria-label={
                  revealed ? `${card.label}${card.matched ? ' (matched)' : ''}` : 'Face-down memory card'
                }
              >
                {revealed ? (
                  <div className="memory-card-face">
                    {card.matched && (
                      <span className="memory-match-badge" aria-hidden="true">
                        <Check size={12} />
                      </span>
                    )}
                    <MemoryIllustration
                      symbolId={card.symbolId}
                      color={card.accentColor}
                      className="memory-card-art"
                    />
                    <span className="memory-card-label">{card.label}</span>
                  </div>
                ) : (
                  <div className={`memory-card-back card-back--${cardBackId}`}>
                    <div className="card-back-inner" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </main>

      {isSetupOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Memory Match Setup"
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Memory Match Setup</h2>
                <p className="modal-subtitle">
                  Pick how many players and how big the card table should be.
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
                <h3>Players</h3>
                <div className="memory-setup-grid memory-setup-grid--2">
                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayerMode === 1 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayerMode(1)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <User size={22} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>1 Player</strong>
                      <span>Solo play &amp; best time</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`memory-setup-option ${
                      draftPlayerMode === 2 ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setDraftPlayerMode(2)
                    }}
                  >
                    <div className="memory-setup-icon">
                      <Users size={22} />
                    </div>
                    <div className="memory-setup-text">
                      <strong>2 Players</strong>
                      <span>Take turns on one screen</span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="customize-section">
                <h3>Board Size</h3>
                <div className="memory-setup-grid memory-setup-grid--3">
                  {MEMORY_GRID_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option memory-setup-option--stack ${
                        draftGridSize === opt.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        soundFX.playButtonTap()
                        setDraftGridSize(opt.id)
                      }}
                    >
                      <div className="memory-setup-icon">
                        <Grid2x2 size={20} />
                      </div>
                      <div className="memory-setup-text">
                        <strong>{opt.label}</strong>
                        <span>
                          {opt.pairs} pairs • {opt.pairs * 2} cards
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="memory-setup-actions">
                <button
                  type="button"
                  className="btn-primary memory-setup-start"
                  onClick={() => startNewDeal(draftGridSize, draftPlayerMode)}
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

      {won && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Memory Match Complete">
          <div className="modal-card win-card">
            <div className="win-trophy">
              <Trophy size={40} />
            </div>
            <h2>{winHeadline}</h2>
            <p className="modal-subtitle">
              {playerMode === 2
                ? `Final score: Player 1 (${game.scores[0]}) — Player 2 (${game.scores[1]})`
                : 'Sharp eyes — every cozy pair is matched!'}
            </p>
            <div className="win-stats-grid">
              <div>
                <span>Moves</span>
                <strong>{game.moves}</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{formatTime(elapsedSeconds)}</strong>
              </div>
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
                onClick={() => startNewDeal(gridSize, playerMode)}
              >
                Play Again
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={openSetupMenu}
              >
                Change Size / Players
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
