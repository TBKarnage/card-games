import type { CSSProperties } from 'react'
import type { CardBackId } from '../config/appDefaults'
import { getRankLabel, isRedSuit } from '../games/solitaire/engine'
import type { Card, Suit } from '../games/solitaire/types'

interface SuitIconProps {
  suit: Suit
  className?: string
}

export function SuitIcon({ suit, className }: SuitIconProps) {
  switch (suit) {
    case 'hearts':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      )
    case 'diamonds':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path fill="currentColor" d="M12 2L20 12L12 22L4 12Z" />
        </svg>
      )
    case 'spades':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2C9 6.2 4 9.6 4 13.5c0 2.5 1.9 4.5 4.4 4.5 1.3 0 2.4-.6 3.1-1.5-.2 1.8-.9 3.4-2.5 4.5h6c-1.6-1.1-2.3-2.7-2.5-4.5.7.9 1.8 1.5 3.1 1.5 2.5 0 4.4-2 4.4-4.5C20 9.6 15 6.2 12 2z"
          />
        </svg>
      )
    case 'clubs':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 3a4.2 4.2 0 0 0-4.2 4.2c0 1 .4 2 1 2.7A4.2 4.2 0 0 0 3.5 14a4.2 4.2 0 0 0 4.2 4.2c1.4 0 2.6-.7 3.4-1.7-.2 1.7-.9 3.3-2.4 4.5h6.6c-1.5-1.2-2.2-2.8-2.4-4.5.8 1 2 1.7 3.4 1.7a4.2 4.2 0 0 0 4.2-4.2 4.2 4.2 0 0 0-5.3-4.1c.6-.7 1-1.7 1-2.7A4.2 4.2 0 0 0 12 3z"
          />
        </svg>
      )
  }
}

interface PlayingCardProps {
  card: Card
  cardBackId: CardBackId
  largePrint?: boolean
  selected?: boolean
  hinted?: boolean
  isDragging?: boolean
  style?: CSSProperties
  className?: string
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function PlayingCard({
  card,
  cardBackId,
  largePrint = false,
  selected = false,
  hinted = false,
  isDragging = false,
  style,
  className = '',
  onPointerDown,
  onClick,
  onDoubleClick,
}: PlayingCardProps) {
  if (!card.faceUp) {
    return (
      <div
        className={`playing-card playing-card--back card-back--${cardBackId} ${
          hinted ? 'is-hinted' : ''
        } ${className}`}
        style={style}
        onPointerDown={onPointerDown}
        onClick={onClick}
        aria-label="Face-down card"
      >
        <div className="card-back-inner" />
      </div>
    )
  }

  const red = isRedSuit(card.suit)
  const rankLabel = getRankLabel(card.rank)
  const isCourt = card.rank >= 11

  return (
    <div
      className={`playing-card playing-card--face ${red ? 'is-red' : 'is-black'} ${
        largePrint ? 'is-large-print' : ''
      } ${selected ? 'is-selected' : ''} ${hinted ? 'is-hinted' : ''} ${
        isDragging ? 'is-dragging' : ''
      } ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`${rankLabel} of ${card.suit}`}
    >
      <div className="card-corner card-corner--top">
        <span className="card-rank">{rankLabel}</span>
        <SuitIcon suit={card.suit} className="card-suit-mini" />
      </div>

      <div className="card-center">
        {isCourt ? (
          <div className="card-court-badge">
            <span className="card-court-letter">{rankLabel}</span>
            <SuitIcon suit={card.suit} className="card-suit-center" />
          </div>
        ) : (
          <SuitIcon suit={card.suit} className="card-suit-center" />
        )}
      </div>

      <div className="card-corner card-corner--bottom" aria-hidden="true">
        <span className="card-rank">{rankLabel}</span>
        <SuitIcon suit={card.suit} className="card-suit-mini" />
      </div>
    </div>
  )
}
