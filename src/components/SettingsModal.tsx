import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Lock,
  MessageSquareHeart,
  SlidersHorizontal,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { APP_DEFAULTS } from '../config/appDefaults'
import { soundFX } from '../utils/audio'
import type { FeedbackReport, ParentBackendConfig, PlayerSettings } from '../utils/storage'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: PlayerSettings
  reports: FeedbackReport[]
  parentConfig: ParentBackendConfig
  activeGameTitle?: string
  onOpenGameSetup?: () => void
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void
  onUpdateParentConfig: (patch: Partial<ParentBackendConfig>) => void
  onOpenFeedback: () => void
  onResetStats: () => void
  onClearReports: () => void
}

function buildGitHubIssueUrl(repo: string, report: FeedbackReport): string {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '')
  const titlePrefix = report.category === 'bug' ? '[Bug]' : '[Idea]'
  const title = `${titlePrefix} ${report.message.slice(0, 60)}`
  const lines = [
    `**Type:** ${report.category === 'bug' ? 'Bug Report' : 'Feature / Game Idea'}`,
    report.whatDoing ? `**What player was doing:** ${report.whatDoing}` : null,
    report.quickTags?.length ? `**Tags:** ${report.quickTags.join(', ')}` : null,
    `**Details:** ${report.message}`,
    `**App Version:** v${report.appVersion}`,
    `**Submitted:** ${report.createdAt}`,
  ].filter(Boolean)

  const params = new URLSearchParams({
    title,
    body: lines.join('\n\n'),
    labels: report.category === 'bug' ? 'bug' : 'enhancement',
  })
  return `https://github.com/${cleanRepo}/issues/new?${params.toString()}`
}

export function SettingsModal({
  open,
  onClose,
  settings,
  reports,
  parentConfig,
  activeGameTitle,
  onOpenGameSetup,
  onUpdateSettings,
  onUpdateParentConfig,
  onOpenFeedback,
  onResetStats,
  onClearReports,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [parentExpanded, setParentExpanded] = useState(false)
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  if (!open) return null

  const handleClose = () => {
    soundFX.playButtonTap()
    setConfirmReset(false)
    setPinInput('')
    setPinError(false)
    setCopyNote(null)
    onClose()
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput.trim() === APP_DEFAULTS.parentPin) {
      soundFX.playCardSnap()
      setParentUnlocked(true)
      setPinError(false)
      setPinInput('')
    } else {
      soundFX.playCardError()
      setPinError(true)
    }
  }

  const handleCopyReports = async () => {
    const payload = JSON.stringify(reports, null, 2)
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      soundFX.playButtonTap()
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyNote('Clipboard unavailable in this preview.')
    }
  }

  const activeRepo = parentConfig.githubRepo.trim() || APP_DEFAULTS.githubIssuesRepo

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Settings</h2>
            <p className="modal-subtitle">Sound, card display &amp; family options</p>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-group">
            {activeGameTitle && onOpenGameSetup && (
              <button
                type="button"
                className="game-settings-shortcut"
                onClick={() => {
                  soundFX.playButtonTap()
                  onClose()
                  onOpenGameSetup()
                }}
              >
                <div className="toggle-label-with-icon">
                  <SlidersHorizontal size={18} />
                  <div>
                    <strong>{activeGameTitle} Settings</strong>
                    <small>Change setup, players &amp; rules for this game</small>
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>
            )}

            <label className="toggle-row">
              <div className="toggle-label-with-icon">
                {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <div>
                  <strong>Cozy Sound Effects</strong>
                  <small>Soft card flips, snaps &amp; win chimes</small>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  const next = e.target.checked
                  soundFX.setEnabled(next)
                  if (next) soundFX.playButtonTap()
                  onUpdateSettings({ soundEnabled: next })
                }}
              />
            </label>

            <label className="toggle-row">
              <div>
                <strong>Large-Print Card Faces</strong>
                <small>Extra-clear numbers &amp; suits</small>
              </div>
              <input
                type="checkbox"
                checked={settings.largePrint}
                onChange={(e) => {
                  soundFX.playButtonTap()
                  onUpdateSettings({ largePrint: e.target.checked })
                }}
              />
            </label>
          </div>

          <div className="settings-group">
            <button
              type="button"
              className="btn-secondary btn-full"
              onClick={() => {
                soundFX.playButtonTap()
                onClose()
                onOpenFeedback()
              }}
            >
              <MessageSquareHeart size={16} /> Bugs &amp; Ideas (Kids &amp; Family)
            </button>

            {!confirmReset ? (
              <button
                type="button"
                className="btn-secondary btn-full"
                onClick={() => {
                  soundFX.playButtonTap()
                  setConfirmReset(true)
                }}
              >
                <Trash2 size={16} /> Reset Win Stats
              </button>
            ) : (
              <div className="confirm-row">
                <span>Reset all saved wins, streaks &amp; best scores for every game?</span>
                <div className="confirm-actions">
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      soundFX.playButtonTap()
                      onResetStats()
                      setConfirmReset(false)
                    }}
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PIN-locked Parent Backend Section */}
          <div className="parent-section">
            <button
              type="button"
              className="parent-toggle-btn"
              onClick={() => {
                soundFX.playButtonTap()
                setParentExpanded((prev) => !prev)
              }}
            >
              {parentUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
              <span>Parent Area — GitHub &amp; Reports</span>
            </button>

            {parentExpanded && !parentUnlocked && (
              <form className="pin-form" onSubmit={handlePinSubmit}>
                <label htmlFor="parent-pin-input">Enter Parent PIN</label>
                <div className="pin-input-row">
                  <input
                    id="parent-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value)
                      setPinError(false)
                    }}
                    placeholder="••••"
                    autoComplete="off"
                  />
                  <button type="submit" className="btn-primary">
                    Unlock
                  </button>
                </div>
                {pinError && <p className="pin-error">Incorrect PIN. Try again.</p>}
              </form>
            )}

            {parentExpanded && parentUnlocked && (
              <div className="parent-panel">
                <div className="backend-config-box">
                  <label htmlFor="github-repo-input">
                    <strong>GitHub Issues Repo</strong>
                    <small>Format: owner/repo (e.g. TBKarnage/card-games)</small>
                  </label>
                  <input
                    id="github-repo-input"
                    type="text"
                    value={parentConfig.githubRepo}
                    onChange={(e) => onUpdateParentConfig({ githubRepo: e.target.value })}
                    placeholder="TBKarnage/card-games"
                  />

                  <label htmlFor="webhook-url-input">
                    <strong>Backend Webhook URL (optional)</strong>
                    <small>POSTs JSON automatically when kids submit Bugs &amp; Ideas</small>
                  </label>
                  <input
                    id="webhook-url-input"
                    type="url"
                    value={parentConfig.webhookUrl}
                    onChange={(e) => onUpdateParentConfig({ webhookUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="report-actions">
                  {reports.length > 0 && (
                    <button type="button" className="btn-secondary" onClick={handleCopyReports}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : `Copy All (${reports.length})`}
                    </button>
                  )}
                </div>
                {copyNote && <p className="status-note">{copyNote}</p>}

                {reports.length > 0 ? (
                  <div className="report-list">
                    <div className="report-list-header">
                      <strong>Submitted Notes ({reports.length})</strong>
                      <button
                        type="button"
                        className="text-link-btn"
                        onClick={() => {
                          soundFX.playButtonTap()
                          onClearReports()
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                    <ul>
                      {reports.slice(0, 10).map((r) => (
                        <li key={r.id} className="report-list-item">
                          <span className={`report-tag report-tag--${r.category}`}>{r.category}</span>
                          <div className="report-msg-col">
                            {r.whatDoing && <small className="report-context">Doing: {r.whatDoing}</small>}
                            <span className="report-msg">{r.message}</span>
                          </div>
                          {activeRepo && (
                            <a
                              className="github-send-link"
                              href={buildGitHubIssueUrl(activeRepo, r)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open as GitHub Issue"
                            >
                              <ExternalLink size={14} />
                              <span>GitHub</span>
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="modal-subtitle">No Bugs &amp; Ideas submitted yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer-version">v{APP_DEFAULTS.version}</div>
      </div>
    </div>
  )
}
