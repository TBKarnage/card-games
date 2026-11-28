import {
  ArrowLeft,
  Flame,
  MessageSquareHeart,
  Palette,
  Play,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { CARD_GAMES_REGISTRY, type CardGameEntry } from '../games/registry'
import { soundFX } from '../utils/audio'
import { navigateToGamesHub } from '../utils/hubNavigation'
import type { PlayerProfile } from '../utils/storage'

interface HomeHubProps {
  profile: PlayerProfile
  onLaunchGame: (gameId: CardGameEntry['id']) => void
  onOpenCustomize: () => void
  onOpenFeedback: () => void
  onOpenSettings: () => void
  onToggleSound: () => void
}

export function HomeHub({
  profile,
  onLaunchGame,
  onOpenCustomize,
  onOpenFeedback,
  onOpenSettings,
  onToggleSound,
}: HomeHubProps) {
  const { gameStats, settings } = profile

  return (
    <div className="hub-shell">
      <header className="hub-header">
        <div className="hub-header-left">
          <button
            type="button"
            className="pill-btn hub-back-btn"
            onClick={() => {
              soundFX.playButtonTap()
              navigateToGamesHub()
            }}
            aria-label="Back to Games Hub"
            title="Back to games.burks.pro"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Hub</span>
          </button>

          <div className="hub-brand">
            <div className="hub-logo" aria-hidden="true">
              <span>♠</span>
              <span className="hub-logo-heart">♥</span>
            </div>
            <div>
              <h1>Cozy Card Table</h1>
              <p>Family card games for slow evenings &amp; weekend mornings</p>
            </div>
          </div>
        </div>

        <div className="hub-actions">
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              soundFX.playButtonTap()
              onOpenCustomize()
            }}
          >
            <Palette size={17} />
            <span>Customize</span>
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              soundFX.playButtonTap()
              onOpenFeedback()
            }}
          >
            <MessageSquareHeart size={17} />
            <span>Bugs &amp; Ideas</span>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--glass"
            onClick={onToggleSound}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title={settings.soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {settings.soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--glass"
            onClick={() => {
              soundFX.playButtonTap()
              onOpenSettings()
            }}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      <main className="hub-main">
        <section className="games-grid" aria-label="Card games shelf">
          {CARD_GAMES_REGISTRY.map((game) => {
            const stats = gameStats[game.id]
            return (
              <article
                key={game.id}
                className={`game-card ${game.available ? 'is-available' : 'is-upcoming'}`}
              >
                <div className="game-card-top">
                  <span
                    className="game-badge"
                    style={{
                      backgroundColor: game.available ? game.accent : 'rgba(255,255,255,0.16)',
                    }}
                  >
                    {game.badge}
                  </span>
                  <span className="game-meta-tags">
                    {game.playersLabel} • {game.ageLabel}
                  </span>
                </div>

                <div className="game-card-body">
                  <h2>{game.title}</h2>
                  <p>{game.subtitle}</p>
                </div>

                <div className="game-card-stats" aria-label={`${game.title} stats`}>
                  <div className="game-stat-cell">
                    <span className="game-stat-label">
                      <Trophy size={12} aria-hidden="true" />
                      <span>{stats.gamesWon === 1 ? 'Win' : 'Wins'}</span>
                    </span>
                    <strong>{stats.gamesWon}</strong>
                  </div>
                  <div className="game-stat-cell">
                    <span className="game-stat-label">
                      <Flame size={12} aria-hidden="true" />
                      <span>Streak</span>
                    </span>
                    <strong>{stats.currentStreak}</strong>
                  </div>
                  <div className="game-stat-cell">
                    <span className="game-stat-label">
                      <span>Best</span>
                    </span>
                    <strong>
                      {stats.bestMoves !== null
                        ? `${stats.bestMoves} ${game.bestScoreUnit}`
                        : '—'}
                    </strong>
                  </div>
                </div>

                <div className="game-card-footer">
                  {game.available ? (
                    <button
                      type="button"
                      className="btn-play"
                      onClick={() => {
                        soundFX.playCardFlip()
                        onLaunchGame(game.id)
                      }}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>Play</span>
                    </button>
                  ) : (
                    <div className="coming-soon-pill">On the shelf soon</div>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}
