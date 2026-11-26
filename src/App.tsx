import { useCallback, useEffect, useState } from 'react'
import { CustomizeModal } from './components/CustomizeModal'
import { FeedbackModal } from './components/FeedbackModal'
import { HomeHub } from './components/HomeHub'
import { SettingsModal } from './components/SettingsModal'
import { CARD_BACKS, TABLE_THEMES } from './config/themes'
import { CARD_GAMES_REGISTRY, type GameId } from './games/registry'
import { GoFishBoard } from './games/go-fish/GoFishBoard'
import { MemoryBoard } from './games/memory/MemoryBoard'
import { SolitaireBoard } from './games/solitaire/SolitaireBoard'
import { TrashBoard } from './games/trash/TrashBoard'
import { soundFX } from './utils/audio'
import {
  getDefaultProfile,
  getTotalWins,
  loadProfile,
  saveProfile,
  type FeedbackReport,
  type ParentBackendConfig,
  type PerGameSettings,
  type PlayerProfile,
  type PlayerSettings,
} from './utils/storage'

export function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [activeGame, setActiveGame] = useState<GameId | null>(null)
  const [gameSetupOpen, setGameSetupOpen] = useState(true)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const totalWins = getTotalWins(profile.gameStats)
  const activeGameEntry = activeGame
    ? CARD_GAMES_REGISTRY.find((entry) => entry.id === activeGame)
    : undefined

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

  const handleUpdateGameSettings = useCallback(
    <K extends GameId>(gameId: K, patch: Partial<PerGameSettings[K]>) => {
      updateProfile((prev) => ({
        ...prev,
        gameSettings: {
          ...prev.gameSettings,
          [gameId]: { ...prev.gameSettings[gameId], ...patch },
        },
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
    (gameId: GameId, moves: number, seconds: number): string[] => {
      const prevTotalWins = getTotalWins(profile.gameStats)
      const nextTotalWins = prevTotalWins + 1

      const newlyUnlocked: string[] = []
      for (const theme of TABLE_THEMES) {
        if (theme.unlockWins > prevTotalWins && theme.unlockWins <= nextTotalWins) {
          newlyUnlocked.push(`${theme.name} Table`)
        }
      }
      for (const back of CARD_BACKS) {
        if (back.unlockWins > prevTotalWins && back.unlockWins <= nextTotalWins) {
          newlyUnlocked.push(`${back.name} Cards`)
        }
      }

      updateProfile((prev) => {
        const current = prev.gameStats[gameId]
        return {
          ...prev,
          gameStats: {
            ...prev.gameStats,
            [gameId]: {
              gamesPlayed: current.gamesPlayed + 1,
              gamesWon: current.gamesWon + 1,
              currentStreak: current.currentStreak + 1,
              bestMoves: current.bestMoves === null ? moves : Math.min(current.bestMoves, moves),
              bestTimeSeconds:
                current.bestTimeSeconds === null
                  ? seconds
                  : Math.min(current.bestTimeSeconds, seconds),
            },
          },
        }
      })

      return newlyUnlocked
    },
    [profile.gameStats, updateProfile]
  )

  const handleRecordLoss = useCallback(
    (gameId: GameId) => {
      updateProfile((prev) => {
        const current = prev.gameStats[gameId]
        return {
          ...prev,
          gameStats: {
            ...prev.gameStats,
            [gameId]: {
              ...current,
              gamesPlayed: current.gamesPlayed + 1,
              currentStreak: 0,
            },
          },
        }
      })
    },
    [updateProfile]
  )

  const handleRecordSolitaireWin = useCallback(
    (moves: number, seconds: number) => handleRecordWin('solitaire', moves, seconds),
    [handleRecordWin]
  )
  const handleRecordMemoryWin = useCallback(
    (moves: number, seconds: number) => handleRecordWin('memory-match', moves, seconds),
    [handleRecordWin]
  )
  const handleRecordMemoryLoss = useCallback(
    () => handleRecordLoss('memory-match'),
    [handleRecordLoss]
  )
  const handleRecordGoFishWin = useCallback(
    (moves: number, seconds: number) => handleRecordWin('go-fish', moves, seconds),
    [handleRecordWin]
  )
  const handleRecordGoFishLoss = useCallback(
    () => handleRecordLoss('go-fish'),
    [handleRecordLoss]
  )
  const handleRecordTrashWin = useCallback(
    (moves: number, seconds: number) => handleRecordWin('trash', moves, seconds),
    [handleRecordWin]
  )
  const handleRecordTrashLoss = useCallback(
    () => handleRecordLoss('trash'),
    [handleRecordLoss]
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
      gameStats: defaults.gameStats,
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

  const handleLaunchGame = useCallback((id: GameId) => {
    setGameSetupOpen(true)
    setActiveGame(id)
  }, [])

  return (
    <div className={`app-root theme--${profile.settings.themeId}`}>
      {activeGame === 'solitaire' ? (
        <SolitaireBoard
          difficulty={profile.gameSettings.solitaire.difficulty}
          drawCount={profile.gameSettings.solitaire.drawCount}
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          isSetupOpen={gameSetupOpen}
          onSetSetupOpen={setGameSetupOpen}
          onChangeSetup={(difficulty, drawCount) =>
            handleUpdateGameSettings('solitaire', { difficulty, drawCount })
          }
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordSolitaireWin}
        />
      ) : activeGame === 'memory-match' ? (
        <MemoryBoard
          gridSize={profile.gameSettings['memory-match'].gridSize}
          playerMode={profile.gameSettings['memory-match'].playerMode}
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          isSetupOpen={gameSetupOpen}
          onSetSetupOpen={setGameSetupOpen}
          onChangeSetup={(gridSize, playerMode) =>
            handleUpdateGameSettings('memory-match', { gridSize, playerMode })
          }
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordMemoryWin}
          onRecordLoss={handleRecordMemoryLoss}
        />
      ) : activeGame === 'go-fish' ? (
        <GoFishBoard
          playerCount={profile.gameSettings['go-fish'].playerCount}
          humanCount={profile.gameSettings['go-fish'].humanCount}
          difficulty={profile.gameSettings['go-fish'].difficulty}
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          isSetupOpen={gameSetupOpen}
          onSetSetupOpen={setGameSetupOpen}
          onChangeSetup={(playerCount, difficulty, humanCount) =>
            handleUpdateGameSettings('go-fish', { playerCount, difficulty, humanCount })
          }
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordGoFishWin}
          onRecordLoss={handleRecordGoFishLoss}
        />
      ) : activeGame === 'trash' ? (
        <TrashBoard
          playerCount={profile.gameSettings.trash.playerCount}
          humanCount={profile.gameSettings.trash.humanCount}
          matchMode={profile.gameSettings.trash.matchMode}
          cardBackId={profile.settings.cardBackId}
          largePrint={profile.settings.largePrint}
          soundEnabled={profile.settings.soundEnabled}
          isSetupOpen={gameSetupOpen}
          onSetSetupOpen={setGameSetupOpen}
          onChangeSetup={(playerCount, matchMode, humanCount) =>
            handleUpdateGameSettings('trash', { playerCount, matchMode, humanCount })
          }
          onBackToHub={() => setActiveGame(null)}
          onOpenCustomize={() => setCustomizeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSound={handleToggleSound}
          onRecordWin={handleRecordTrashWin}
          onRecordLoss={handleRecordTrashLoss}
        />
      ) : (
        <HomeHub
          profile={profile}
          onLaunchGame={handleLaunchGame}
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
        gamesWon={totalWins}
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
        activeGameTitle={activeGameEntry?.title}
        onOpenGameSetup={activeGame ? () => setGameSetupOpen(true) : undefined}
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
