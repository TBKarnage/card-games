import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Layers,
  Lightbulb,
  Palette,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { PlayingCard, SuitIcon } from '../../components/PlayingCard'
import type { CardBackId, DrawCount, SolitaireDifficulty } from '../../config/appDefaults'
import { soundFX } from '../../utils/audio'
import {
  SUITS,
  canAutoComplete,
  dealKlondike,
  drawFromStock,
  findAutoMoveTarget,
  findHint,
  getMovingCards,
  hasAnyProgressMoves,
  isGameWon,
  moveCards,
  stepAutoComplete,
} from './engine'
import type { Card, MoveHint, PileLocation, SolitaireState } from './types'

interface SolitaireBoardProps {
  difficulty: SolitaireDifficulty
  drawCount: DrawCount
  cardBackId: CardBackId
  largePrint: boolean
  soundEnabled: boolean
  onChangeSetup: (difficulty: SolitaireDifficulty, drawCount: DrawCount) => void
  onBackToHub: () => void
  onOpenCustomize: () => void
  onOpenSettings: () => void
  onToggleSound: () => void
  onRecordWin: (moves: number, seconds: number) => string[]
}

interface DragSession {
  from: PileLocation
  cards: Card[]
  startX: number
  startY: number
  currentX: number
  currentY: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  active: boolean
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function sameLocation(a: PileLocation | null, b: PileLocation | null): boolean {
  if (!a || !b) return false
  if (a.zone !== b.zone) return false
  if ('index' in a && 'index' in b && a.index !== b.index) return false
  if (a.zone === 'tableau' && b.zone === 'tableau') {
    return (a.cardIndex ?? -1) === (b.cardIndex ?? -1)
  }
  return true
}

const DIFFICULTY_LABEL: Record<SolitaireDifficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}

const DIFFICULTY_OPTIONS: { id: SolitaireDifficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Gentler opening deals' },
  { id: 'normal', label: 'Normal', hint: 'Classic random shuffle' },
  { id: 'hard', label: 'Hard', hint: 'Trickier opening deals' },
]

const DRAW_OPTIONS: { id: DrawCount; label: string; hint: string }[] = [
  { id: 1, label: 'Draw 1', hint: 'Flip 1 card at a time' },
  { id: 3, label: 'Draw 3', hint: 'Flip 3 cards at a time' },
]

export function SolitaireBoard({
  difficulty,
  drawCount,
  cardBackId,
  largePrint,
  soundEnabled,
  onChangeSetup,
  onBackToHub,
  onOpenCustomize,
  onOpenSettings,
  onToggleSound,
  onRecordWin,
}: SolitaireBoardProps) {
  const [draftDifficulty, setDraftDifficulty] = useState<SolitaireDifficulty>(difficulty)
  const [draftDrawCount, setDraftDrawCount] = useState<DrawCount>(drawCount)
  const [isSetupOpen, setIsSetupOpen] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const [gameState, setGameState] = useState<SolitaireState>(() =>
    dealKlondike(drawCount, Math.random, difficulty)
  )
  const [undoStack, setUndoStack] = useState<SolitaireState[]>([])
  const [selected, setSelected] = useState<PileLocation | null>(null)
  const [hint, setHint] = useState<MoveHint | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [autoCompleting, setAutoCompleting] = useState(false)
  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const [unlockedRewards, setUnlockedRewards] = useState<string[]>([])
  const [dismissedStuckAtMoves, setDismissedStuckAtMoves] = useState<number | null>(null)

  const won = useMemo(() => isGameWon(gameState), [gameState])
  const autoCompleteReady = useMemo(() => canAutoComplete(gameState), [gameState])
  const hasProgressMoves = useMemo(() => hasAnyProgressMoves(gameState), [gameState])
  const isStuck =
    !won &&
    !isSetupOpen &&
    !autoCompleting &&
    !autoCompleteReady &&
    !hasProgressMoves &&
    dismissedStuckAtMoves !== gameState.moves

  const winRecordedRef = useRef(false)
  const lastTapRef = useRef<{ loc: PileLocation; time: number } | null>(null)

  // Timer (paused while setup modal, stuck modal, or win modal is open)
  useEffect(() => {
    if (won || isStuck || isSetupOpen) return
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [won, isStuck, isSetupOpen])

  // Record win once
  useEffect(() => {
    if (won && !winRecordedRef.current) {
      winRecordedRef.current = true
      setAutoCompleting(false)
      soundFX.playWinFanfare()
      const newlyUnlocked = onRecordWin(gameState.moves, elapsedSeconds)
      setUnlockedRewards(newlyUnlocked)
    }
  }, [won, gameState.moves, elapsedSeconds, onRecordWin])

  // Auto-complete loop
  useEffect(() => {
    if (!autoCompleting || won) return
    const timer = window.setTimeout(() => {
      const next = stepAutoComplete(gameState)
      if (!next) {
        setAutoCompleting(false)
        return
      }
      soundFX.playCardSnap()
      setUndoStack((prev) => [...prev.slice(-59), gameState])
      setGameState(next)
    }, 85)
    return () => window.clearTimeout(timer)
  }, [autoCompleting, gameState, won])

  const startNewDeal = useCallback(
    (nextDifficulty: SolitaireDifficulty = difficulty, nextDrawCount: DrawCount = drawCount) => {
      soundFX.playCardFlip()
      winRecordedRef.current = false
      setUnlockedRewards([])
      setAutoCompleting(false)
      setDismissedStuckAtMoves(null)
      setSelected(null)
      setHint(null)
      setUndoStack([])
      setElapsedSeconds(0)
      onChangeSetup(nextDifficulty, nextDrawCount)
      setGameState(dealKlondike(nextDrawCount, Math.random, nextDifficulty))
      setHasStarted(true)
      setIsSetupOpen(false)
    },
    [difficulty, drawCount, onChangeSetup]
  )

  const openSetupMenu = () => {
    soundFX.playButtonTap()
    setDraftDifficulty(difficulty)
    setDraftDrawCount(drawCount)
    setIsSetupOpen(true)
  }

  const commitMove = useCallback(
    (from: PileLocation, to: PileLocation): boolean => {
      const result = moveCards(gameState, from, to)
      if (!result.moved) return false

      setUndoStack((prev) => [...prev.slice(-59), gameState])
      setGameState(result.nextState)
      setSelected(null)
      setHint(null)

      if (result.toFoundation) {
        soundFX.playCardSnap()
      } else if (result.flipped) {
        soundFX.playCardFlip()
      } else {
        soundFX.playCardPlace()
      }
      return true
    },
    [gameState]
  )

  const handleDrawStock = () => {
    if (autoCompleting || won) return
    if (gameState.stock.length === 0 && gameState.waste.length === 0) return
    soundFX.playCardFlip()
    setUndoStack((prev) => [...prev.slice(-59), gameState])
    setGameState((prev) => drawFromStock(prev))
    setSelected(null)
    setHint(null)
  }

  const handleUndo = () => {
    if (undoStack.length === 0 || autoCompleting) return
    soundFX.playButtonTap()
    const previous = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setGameState(previous)
    setSelected(null)
    setHint(null)
  }

  const handleHint = () => {
    if (won || autoCompleting) return
    const nextHint = findHint(gameState)
    if (nextHint) {
      soundFX.playButtonTap()
      setHint(nextHint)
    } else {
      soundFX.playCardError()
      setHint({ from: { zone: 'stock' }, to: { zone: 'stock' }, label: 'No moves left — try Undo or New Deal!' })
    }
  }

  const handleTapLocation = useCallback(
    (loc: PileLocation, isTargetOnly = false) => {
      if (autoCompleting || won) return

      const now = Date.now()
      const isDoubleTap =
        !isTargetOnly &&
        lastTapRef.current !== null &&
        now - lastTapRef.current.time < 340 &&
        sameLocation(lastTapRef.current.loc, loc)

      if (isDoubleTap) {
        lastTapRef.current = null
        const autoTarget = findAutoMoveTarget(gameState, loc)
        if (autoTarget && commitMove(loc, autoTarget)) {
          return
        }
      } else if (!isTargetOnly) {
        lastTapRef.current = { loc, time: now }
      }

      if (selected) {
        if (sameLocation(selected, loc)) {
          // Second tap on selected card: try auto-move or deselect
          const autoTarget = findAutoMoveTarget(gameState, loc)
          if (autoTarget && commitMove(loc, autoTarget)) {
            return
          }
          setSelected(null)
          return
        }

        const target: PileLocation =
          loc.zone === 'tableau'
            ? { zone: 'tableau', index: loc.index }
            : loc.zone === 'foundation'
              ? { zone: 'foundation', index: loc.index }
              : loc

        if (commitMove(selected, target)) {
          return
        }
      }

      if (!isTargetOnly && getMovingCards(gameState, loc).length > 0) {
        soundFX.playButtonTap()
        setSelected(loc)
      } else if (selected) {
        soundFX.playCardError()
        setSelected(null)
      }
    },
    [autoCompleting, won, gameState, selected, commitMove]
  )

  // Pointer Dragging
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, from: PileLocation) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (autoCompleting || won) return

    const cards = getMovingCards(gameState, from)
    if (cards.length === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    setDragSession({
      from,
      cards,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      active: false,
    })
  }

  useEffect(() => {
    if (!dragSession) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragSession((prev) => {
        if (!prev) return null
        const dx = e.clientX - prev.startX
        const dy = e.clientY - prev.startY
        const active = prev.active || Math.hypot(dx, dy) > 6
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
          active,
        }
      })
    }

    const handlePointerUp = (e: PointerEvent) => {
      setDragSession((prev) => {
        if (!prev) return null
        if (!prev.active) {
          handleTapLocation(prev.from)
          return null
        }

        const elements = document.elementsFromPoint(e.clientX, e.clientY)
        for (const el of elements) {
          const dropAttr = el.getAttribute('data-drop-zone')
          if (!dropAttr) continue
          const [zone, idxStr] = dropAttr.split('-')
          const index = Number(idxStr)
          if (zone === 'foundation') {
            if (commitMove(prev.from, { zone: 'foundation', index })) return null
          } else if (zone === 'tableau') {
            if (commitMove(prev.from, { zone: 'tableau', index })) return null
          }
        }

        soundFX.playCardError()
        return null
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragSession, commitMove, handleTapLocation])

  const isCardHiddenByDrag = (loc: PileLocation): boolean => {
    if (!dragSession || !dragSession.active) return false
    const from = dragSession.from
    if (from.zone !== loc.zone) return false
    if (from.zone === 'waste' && loc.zone === 'waste') return true
    if (from.zone === 'foundation' && loc.zone === 'foundation') return from.index === loc.index
    if (from.zone === 'tableau' && loc.zone === 'tableau') {
      return (
        from.index === loc.index &&
        (loc.cardIndex ?? 0) >= (from.cardIndex ?? 0)
      )
    }
    return false
  }

  const isHintedSource = (loc: PileLocation): boolean => {
    if (!hint) return false
    return sameLocation(hint.from, loc)
  }

  const isHintedTarget = (zone: 'foundation' | 'tableau', index: number): boolean => {
    if (!hint) return false
    return hint.to.zone === zone && 'index' in hint.to && hint.to.index === index
  }

  const wasteVisible = gameState.waste.slice(-3)

  return (
    <div className="solitaire-shell">
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
            onClick={() => startNewDeal(difficulty)}
            title="New Deal"
          >
            <RotateCcw size={17} />
            <span className="hud-label">New Deal</span>
          </button>

          <button
            type="button"
            className="hud-btn"
            onClick={handleUndo}
            disabled={undoStack.length === 0 || autoCompleting}
            title="Undo"
          >
            <Undo2 size={17} />
            <span className="hud-label">Undo</span>
          </button>

          <button type="button" className="hud-btn" onClick={handleHint} title="Hint">
            <Lightbulb size={17} />
            <span className="hud-label">Hint</span>
          </button>

          {autoCompleteReady && !autoCompleting && (
            <button
              type="button"
              className="hud-btn hud-btn--accent"
              onClick={() => {
                soundFX.playCardSnap()
                setAutoCompleting(true)
              }}
            >
              <Sparkles size={17} />
              <span>Auto-Finish</span>
            </button>
          )}
        </div>

        <div className="hud-center">
          <div className="hud-stat">
            <span>Moves</span>
            <strong>{gameState.moves}</strong>
          </div>
          <div className="hud-stat">
            <span>Time</span>
            <strong>{formatTime(elapsedSeconds)}</strong>
          </div>
          <button
            type="button"
            className="draw-pill"
            onClick={openSetupMenu}
            title="Customize difficulty & draw mode"
          >
            <SlidersHorizontal size={14} />
            <span>
              {DIFFICULTY_LABEL[difficulty]} • Draw {drawCount}
            </span>
          </button>
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

      {hint && (
        <div className="hint-banner" role="status">
          <Lightbulb size={15} />
          <span>{hint.label}</span>
        </div>
      )}

      {/* Main Felt / Table Board */}
      <main className="solitaire-board">
        {/* Top Row: Stock, Waste, Spacer, 4 Foundations */}
        <div className="top-row">
          <div className="stock-waste-group">
            {/* Stock */}
            <div
              className={`pile-slot pile-slot--stock ${
                hint?.from.zone === 'stock' ? 'is-hinted-slot' : ''
              }`}
              onClick={handleDrawStock}
              role="button"
              tabIndex={0}
              aria-label={
                gameState.stock.length > 0
                  ? `Draw from stock (${gameState.stock.length} cards left)`
                  : 'Recycle waste pile to stock'
              }
            >
              {gameState.stock.length > 0 ? (
                <div className="stock-stack">
                  <PlayingCard
                    card={gameState.stock[gameState.stock.length - 1]}
                    cardBackId={cardBackId}
                    hinted={hint?.from.zone === 'stock'}
                  />
                  <span className="stock-count">{gameState.stock.length}</span>
                </div>
              ) : (
                <div className="empty-stock-recycle">
                  <RotateCcw size={22} />
                </div>
              )}
            </div>

            {/* Waste */}
            <div className="pile-slot pile-slot--waste">
              {wasteVisible.length === 0 ? (
                <div className="empty-slot-mark" />
              ) : (
                <div className="waste-fan">
                  {wasteVisible.map((card, idx) => {
                    const isTop = idx === wasteVisible.length - 1
                    const loc: PileLocation = { zone: 'waste' }
                    const hidden = isTop && isCardHiddenByDrag(loc)
                    const fanOffset = gameState.drawCount === 3 ? idx * 14 : 0
                    return (
                      <div
                        key={card.id}
                        className="waste-card-pos"
                        style={{
                          transform: `translateX(${fanOffset}px)`,
                          opacity: hidden ? 0 : 1,
                          pointerEvents: isTop ? 'auto' : 'none',
                        }}
                      >
                        <PlayingCard
                          card={card}
                          cardBackId={cardBackId}
                          largePrint={largePrint}
                          selected={isTop && sameLocation(selected, loc)}
                          hinted={isTop && isHintedSource(loc)}
                          onPointerDown={isTop ? (e) => startDrag(e, loc) : undefined}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Foundations */}
          <div className="foundations-group">
            {gameState.foundations.map((pile, fIdx) => {
              const loc: PileLocation = { zone: 'foundation', index: fIdx }
              const topCard = pile.length > 0 ? pile[pile.length - 1] : null
              const hidden = isCardHiddenByDrag(loc)
              const suitHint = SUITS[fIdx]

              return (
                <div
                  key={fIdx}
                  data-drop-zone={`foundation-${fIdx}`}
                  className={`pile-slot pile-slot--foundation ${
                    isHintedTarget('foundation', fIdx) ? 'is-hinted-slot' : ''
                  }`}
                  onClick={() => {
                    if (selected) {
                      handleTapLocation(loc, true)
                    }
                  }}
                >
                  {topCard && !hidden ? (
                    <PlayingCard
                      card={topCard}
                      cardBackId={cardBackId}
                      largePrint={largePrint}
                      selected={sameLocation(selected, loc)}
                      onPointerDown={(e) => startDrag(e, loc)}
                    />
                  ) : (
                    <div className="foundation-placeholder" aria-label={`Foundation ${fIdx + 1}`}>
                      <SuitIcon suit={suitHint} className="foundation-suit-ghost" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Row: 7 Tableau Columns */}
        <div className="tableau-row">
          {gameState.tableau.map((pile, colIdx) => {
            const emptyTarget: PileLocation = { zone: 'tableau', index: colIdx }
            const hintedCol = isHintedTarget('tableau', colIdx)
            return (
              <div
                key={colIdx}
                data-drop-zone={`tableau-${colIdx}`}
                className={`tableau-col ${pile.length > 0 && hintedCol ? 'is-hinted-slot' : ''}`}
                onClick={() => {
                  if (pile.length === 0 && selected) {
                    handleTapLocation(emptyTarget, true)
                  }
                }}
              >
                {pile.length === 0 && (
                  <div
                    className={`pile-slot tableau-empty-slot ${hintedCol ? 'is-hinted-slot' : ''}`}
                  >
                    K
                  </div>
                )}

                {pile.map((card, cardIdx) => {
                  const loc: PileLocation = { zone: 'tableau', index: colIdx, cardIndex: cardIdx }
                  const hidden = isCardHiddenByDrag(loc)
                  const isSel =
                    selected?.zone === 'tableau' &&
                    selected.index === colIdx &&
                    cardIdx >= (selected.cardIndex ?? pile.length)

                  // Calculate cumulative vertical offset
                  let topPx = 0
                  for (let i = 0; i < cardIdx; i++) {
                    topPx += pile[i].faceUp ? 24 : 11
                  }

                  return (
                    <div
                      key={card.id}
                      className="tableau-card-wrap"
                      style={{
                        top: `${topPx}px`,
                        zIndex: cardIdx + 1,
                        opacity: hidden ? 0 : 1,
                      }}
                    >
                      <PlayingCard
                        card={card}
                        cardBackId={cardBackId}
                        largePrint={largePrint}
                        selected={isSel}
                        hinted={isHintedSource(loc)}
                        onPointerDown={card.faceUp ? (e) => startDrag(e, loc) : undefined}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </main>

      {/* Floating Drag Layer */}
      {dragSession && dragSession.active && (
        <div
          className="drag-layer"
          style={{
            transform: `translate3d(${dragSession.currentX - dragSession.offsetX}px, ${
              dragSession.currentY - dragSession.offsetY
            }px, 0)`,
            width: `${dragSession.width}px`,
          }}
        >
          {dragSession.cards.map((card, idx) => (
            <div
              key={card.id}
              className="drag-card-item"
              style={{ top: `${idx * 24}px`, zIndex: idx + 1 }}
            >
              <PlayingCard
                card={card}
                cardBackId={cardBackId}
                largePrint={largePrint}
                isDragging
              />
            </div>
          ))}
        </div>
      )}

      {/* Pre-game Setup Modal */}
      {isSetupOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Klondike Solitaire Setup"
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Klondike Solitaire Setup</h2>
                <p className="modal-subtitle">
                  Pick your difficulty and whether to draw 1 or 3 cards at a time.
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
                <h3>Difficulty</h3>
                <div className="memory-setup-grid memory-setup-grid--3">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option memory-setup-option--stack ${
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

              <section className="customize-section">
                <h3>Draw Mode</h3>
                <div className="memory-setup-grid memory-setup-grid--2">
                  {DRAW_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`memory-setup-option ${
                        draftDrawCount === opt.id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        soundFX.playButtonTap()
                        setDraftDrawCount(opt.id)
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
                  onClick={() => startNewDeal(draftDifficulty, draftDrawCount)}
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

      {/* Win Celebration Modal */}
      {won && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="You Won!">
          <div className="modal-card win-card">
            <div className="win-trophy">
              <Trophy size={40} />
            </div>
            <h2>You Cleared the Table!</h2>
            <p className="modal-subtitle">Warm cheers — every suit is neatly stacked.</p>

            <div className="win-stats-grid">
              <div>
                <span>Moves</span>
                <strong>{gameState.moves}</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{formatTime(elapsedSeconds)}</strong>
              </div>
            </div>

            {unlockedRewards.length > 0 && (
              <div className="unlock-banner">
                <Sparkles size={16} />
                <span>Unlocked: {unlockedRewards.join(', ')}!</span>
              </div>
            )}

            <div className="win-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => startNewDeal(difficulty, drawCount)}
              >
                Play Again
              </button>
              <button type="button" className="btn-secondary" onClick={openSetupMenu}>
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

      {/* No More Moves Popup */}
      {isStuck && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="No More Moves">
          <div className="modal-card win-card">
            <div className="win-trophy stuck-icon">
              <AlertCircle size={38} />
            </div>
            <h2>No More Moves Left!</h2>
            <p className="modal-subtitle">
              There aren&apos;t any moves left that can move the game forward.
            </p>

            <div className="win-actions stuck-actions">
              {undoStack.length > 0 && (
                <button type="button" className="btn-secondary" onClick={handleUndo}>
                  <Undo2 size={16} /> Undo
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => startNewDeal(difficulty, drawCount)}
              >
                <RotateCcw size={16} /> New Deal
              </button>
              <button type="button" className="btn-secondary" onClick={openSetupMenu}>
                Change Setup
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  soundFX.playButtonTap()
                  setDismissedStuckAtMoves(gameState.moves)
                }}
              >
                Keep Looking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
