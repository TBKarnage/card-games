import { Check, Lock, Sparkles, X } from 'lucide-react'
import type { CardBackId, TableThemeId } from '../config/appDefaults'
import { CARD_BACKS, TABLE_THEMES, isThemeUnlocked } from '../config/themes'
import { soundFX } from '../utils/audio'

interface CustomizeModalProps {
  open: boolean
  onClose: () => void
  themeId: TableThemeId
  cardBackId: CardBackId
  largePrint: boolean
  gamesWon: number
  onSelectTheme: (id: TableThemeId) => void
  onSelectCardBack: (id: CardBackId) => void
  onToggleLargePrint: (enabled: boolean) => void
}

export function CustomizeModal({
  open,
  onClose,
  themeId,
  cardBackId,
  largePrint,
  gamesWon,
  onSelectTheme,
  onSelectCardBack,
  onToggleLargePrint,
}: CustomizeModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Customize Table">
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Cozy Table &amp; Cards</h2>
            <p className="modal-subtitle">
              Make the table feel like home. Win games to unlock new styles!
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              soundFX.playButtonTap()
              onClose()
            }}
            aria-label="Close customize modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <section className="customize-section">
            <div className="section-label-row">
              <h3>Table Surface</h3>
              <span className="wins-pill">
                <Sparkles size={14} /> {gamesWon} {gamesWon === 1 ? 'Win' : 'Wins'}
              </span>
            </div>
            <div className="swatch-grid">
              {TABLE_THEMES.map((theme) => {
                const unlocked = isThemeUnlocked(theme.unlockWins, gamesWon)
                const active = theme.id === themeId
                return (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={!unlocked}
                    className={`swatch-option ${active ? 'is-active' : ''} ${
                      !unlocked ? 'is-locked' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      onSelectTheme(theme.id)
                    }}
                  >
                    <span className="swatch-preview" style={{ background: theme.swatch }}>
                      {active && <Check size={18} className="swatch-check" />}
                      {!unlocked && <Lock size={16} className="swatch-lock" />}
                    </span>
                    <span className="swatch-meta">
                      <strong>{theme.name}</strong>
                      <small>
                        {unlocked
                          ? theme.description
                          : `Win ${theme.unlockWins} ${theme.unlockWins === 1 ? 'game' : 'games'} to unlock`}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="customize-section">
            <h3>Card Back Design</h3>
            <div className="swatch-grid">
              {CARD_BACKS.map((back) => {
                const unlocked = isThemeUnlocked(back.unlockWins, gamesWon)
                const active = back.id === cardBackId
                return (
                  <button
                    key={back.id}
                    type="button"
                    disabled={!unlocked}
                    className={`swatch-option ${active ? 'is-active' : ''} ${
                      !unlocked ? 'is-locked' : ''
                    }`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      onSelectCardBack(back.id)
                    }}
                  >
                    <span
                      className={`swatch-preview swatch-preview--card card-back--${back.id}`}
                      style={{ backgroundColor: back.primaryColor }}
                    >
                      {active && <Check size={18} className="swatch-check" />}
                      {!unlocked && <Lock size={16} className="swatch-lock" />}
                    </span>
                    <span className="swatch-meta">
                      <strong>{back.name}</strong>
                      <small>
                        {unlocked
                          ? back.description
                          : `Win ${back.unlockWins} ${back.unlockWins === 1 ? 'game' : 'games'} to unlock`}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="customize-section">
            <label className="toggle-row">
              <div>
                <strong>Kid-Friendly Large Print</strong>
                <small>Bigger numbers &amp; suits on every card for easy reading</small>
              </div>
              <input
                type="checkbox"
                checked={largePrint}
                onChange={(e) => {
                  soundFX.playButtonTap()
                  onToggleLargePrint(e.target.checked)
                }}
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}
