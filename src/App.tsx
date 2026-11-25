import { useCallback, useEffect, useState } from 'react'
import { CustomizeModal } from './components/CustomizeModal'
import { FeedbackModal } from './components/FeedbackModal'
import { HomeHub } from './components/HomeHub'
import { SettingsModal } from './components/SettingsModal'
import { CARD_BACKS, TABLE_THEMES } from './config/themes'
import type { CardGameEntry } from './games/registry'
import { GoFishBoard } from './games/go-fish/GoFishBoard'
import { MemoryBoard } from './games/memory/MemoryBoard'
import { SolitaireBoard } from './games/solitaire/SolitaireBoard'
import { soundFX } from './utils/audio'
import {
  getDefaultProfile,
  loadProfile,
  saveProfile,
  type FeedbackReport,
  type ParentBackendConfig,
  type PlayerProfile,
  type PlayerSettings,
} from './utils/storage'

export function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [activeGame, setActiveGame] = useState<CardGameEntry['id'] | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Keep soundFX synced & unlock Web Audio on first user interaction
  useEffect(() => {
    soundFX.setEnabled(profile.settings.soundEnabled)
  }, [profile.settings.soundEnabled])

  useEffect(() => {
    const unlockOnce = () => {
      soundFX.unlock()
    }
    window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true })
    window.addEventListener('keydown', unlockOnce, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', unlockOnce)
      window.removeEventListener('keydown', unlockOnce)
    }
  }, [])

  const updateProfile = useCallback((updater: (prev: PlayerProfile) => PlayerProfile) => {
    setProfile((prev) => {
      const next = updater(prev)
      saveProfile(next)
      return next
    })
  }, [])

  const handleUpdateSettings = useCallback(
    (patch: Partial<PlayerSettings>) => {
      updateProfile((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }))
    },
    [updateProfile]
  )

  const handleUpdateParentConfig = useCallback(
    (patch: Partial<ParentBackendConfig>) => {
      updateProfile((prev) => ({
        ...prev,
        parentConfig: { ...prev.parentConfig, ...patch },
      }))
    },
    [updateProfile]
  )

  const handleToggleSound = useCallback(() => {
    const nextSound = !profile.settings.soundEnabled
    soundFX.setEnabled(nextSound)
    if (nextSound) soundFX.playButtonTap()
    handleUpdateSettings({ soundEnabled: nextSound })
  }, [profile.settings.soundEnabled, handleUpdateSettings])

  const handleRecordWin = useCallback(
    (moves: number, seconds: number): string[] => {
      const prevWins = profile.stats.gamesWon
      const nextWins = prevWins + 1

      const newlyUnlocked: string[] = []
      for (const theme of TABLE_THEMES) {
        if (theme.unlockWins > prevWins && theme.unlockWins <= nextWins) {
          newlyUnlocked.push(`${theme.name} Table`)
        }
      }
      for (const back of CARD_BACKS) {
        if (back.unlockWins > prevWins && back.unlockWins <= nextWins) {
          newlyUnlocked.push(`${back.name} Cards`)
        }
      }

      updateProfile((prev) => ({
        ...prev,
        stats: {
          gamesPlayed: prev.stats.gamesPlayed + 1,
          gamesWon: prev.stats.gamesWon + 1,
          currentStreak: prev.stats.currentStreak + 1,
          bestMoves:
            prev.stats.bestMoves === null ? moves : Math.min(prev.stats.bestMoves, moves),
          bestTimeSeconds:
            prev.stats.bestTimeSeconds === null
              ? seconds
              : Math.min(prev.stats.bestTimeSeconds, seconds),
        },
      }))

      return newlyUnlocked
    },
    [profile.stats.gamesWon, updateProfile]
  )

  const handleResetStats = useCallback(() => {
    const defaults = getDefaultProfile()
    updateProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeId: defaults.settings.themeId,
        cardBackId: defaults.settings.cardBackId,
      },
      stats: defaults.stats,
    }))
  }, [updateProfile])

  const handleAddReport = useCallback(
    (report: FeedbackReport) => {
      updateProfile((prev) => ({
        ...prev,
        parentReports: [report, ...prev.parentReports],
      }))
    },
    [updateProfile]
  )

  const handleClearReports = useCallback(() => {
    updateProfile((prev) => ({
      ...prev,
      parentReports: [],
    }))
  }, [updateProfile])

  return (
    <div className={`app-root theme--${profile.settings.themeId}`}>
      {activeGame === 'solitaire' ? (
        <SolitaireBoard
          difficulty={profile.settings.difficulty}
          drawCount={profile.settings.drawCount}
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          onChangeSetup={(difficulty, drawCount) =>
            handleUpdateSettings({ difficulty, drawCount })
          }
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordWin}
        />
      ) : activeGame === 'memory-match' ? (
        <MemoryBoard
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordWin}
        />
      ) : activeGame === 'go-fish' ? (
        <GoFishBoard
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordWin}
        />
      ) : (
        <HomeHub
          profile={profile}
          onLaunchGame={(id) => {
            if (id === 'solitaire' || id === 'memory-match' || id === 'go-fish') {
              setActiveGame(id)
            }
          }}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
        />
      )}

      <CustomizeModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        themeId={profile.settings.themeId}
        cardBackId={profile.settings.cardBackId}
        largePrint={profile.settings.largePrint}
        gamesWon={profile.stats.gamesWon}
        onSelectTheme={(themeId) => handleUpdateSettings({ themeId })}
        onSelectCardBack={(cardBackId) => handleUpdateSettings({ cardBackId })}
        onToggleLargePrint={(largePrint) => handleUpdateSettings({ largePrint })}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        parentConfig={profile.parentConfig}
        onAddReport={handleAddReport}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={profile.settings}
        reports={profile.parentReports}
        parentConfig={profile.parentConfig}
        onUpdateSettings={handleUpdateSettings}
        onUpdateParentConfig={handleUpdateParentConfig}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onResetStats={handleResetStats}
        onClearReports={handleClearReports}
      />
    </div>
  )
}

export default App
