import { useState } from 'react'
import { ArrowLeft, Bug, CheckCircle2, Lightbulb, Sparkles, X } from 'lucide-react'
import { APP_DEFAULTS } from '../config/appDefaults'
import { soundFX } from '../utils/audio'
import type { FeedbackReport, ParentBackendConfig } from '../utils/storage'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
  parentConfig: ParentBackendConfig
  onAddReport: (report: FeedbackReport) => void
}

const WHAT_DOING_OPTIONS = [
  'Moving a card',
  'Drawing from the deck',
  'Using Undo or Hint',
  'Changing table or card styles',
  'Something else',
]

const BUG_QUICK_TAGS = [
  "Card wouldn't move",
  'Screen looked funny',
  'Sound acted weird',
  'Got stuck',
]

const IDEA_QUICK_TAGS = [
  'New card game',
  'New table color',
  'New card back',
  'Fun sound or badge',
]

export function FeedbackModal({
  open,
  onClose,
  parentConfig,
  onAddReport,
}: FeedbackModalProps) {
  const [step, setStep] = useState<'choose' | 'doing' | 'details' | 'done'>('choose')
  const [category, setCategory] = useState<'bug' | 'idea'>('idea')
  const [whatDoing, setWhatDoing] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const resetAndClose = () => {
    soundFX.playButtonTap()
    setStep('choose')
    setWhatDoing('')
    setSelectedTags([])
    setMessage('')
    onClose()
  }

  const toggleTag = (tag: string) => {
    soundFX.playButtonTap()
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const summaryParts = [...selectedTags]
    if (message.trim()) summaryParts.push(message.trim())
    const finalMessage = summaryParts.join(' — ') || (category === 'bug' ? 'Bug report' : 'Game idea')

    setSubmitting(true)
    let sentToWebhook = false
    const webhookUrl = parentConfig.webhookUrl || APP_DEFAULTS.parentWebhookUrl

    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app: APP_DEFAULTS.slug,
            version: APP_DEFAULTS.version,
            category,
            whatDoing: whatDoing || undefined,
            quickTags: selectedTags,
            message: finalMessage,
            createdAt: new Date().toISOString(),
          }),
        })
        sentToWebhook = res.ok
      } catch {
        sentToWebhook = false
      }
    }

    onAddReport({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      whatDoing: category === 'bug' ? whatDoing : undefined,
      quickTags: selectedTags.length > 0 ? selectedTags : undefined,
      message: finalMessage,
      createdAt: new Date().toISOString(),
      appVersion: APP_DEFAULTS.version,
      sentToWebhook,
    })

    setSubmitting(false)
    soundFX.playCardSnap()
    setStep('done')
  }

  return (
    <div
      className="modal-backdrop"
      onClick={resetAndClose}
      role="dialog"
      aria-modal="true"
      aria-label="Bugs and Ideas"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Bugs &amp; Ideas</h2>
            <p className="modal-subtitle">Help make Cozy Card Games even better!</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={resetAndClose}
            aria-label="Close Bugs and Ideas"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'choose' && (
            <div className="feedback-choose-grid">
              <button
                type="button"
                className="feedback-choice-card"
                onClick={() => {
                  soundFX.playButtonTap()
                  setCategory('bug')
                  setSelectedTags([])
                  setStep('doing')
                }}
              >
                <span className="choice-icon choice-icon--bug">
                  <Bug size={26} />
                </span>
                <strong>Something went wrong</strong>
                <small>Tell us if a card or button acted funny</small>
              </button>

              <button
                type="button"
                className="feedback-choice-card"
                onClick={() => {
                  soundFX.playButtonTap()
                  setCategory('idea')
                  setWhatDoing('')
                  setSelectedTags([])
                  setStep('details')
                }}
              >
                <span className="choice-icon choice-icon--idea">
                  <Lightbulb size={26} />
                </span>
                <strong>I have an idea!</strong>
                <small>Suggest a new game, color, or fun feature</small>
              </button>
            </div>
          )}

          {step === 'doing' && (
            <div className="feedback-step">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => {
                  soundFX.playButtonTap()
                  setStep('choose')
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>

              <h3>What were you doing when it happened?</h3>
              <div className="kid-chip-list">
                {WHAT_DOING_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`kid-chip ${whatDoing === option ? 'is-active' : ''}`}
                    onClick={() => {
                      soundFX.playButtonTap()
                      setWhatDoing(option)
                      setStep('details')
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <form className="feedback-step" onSubmit={handleSubmit}>
              <button
                type="button"
                className="step-back-btn"
                onClick={() => {
                  soundFX.playButtonTap()
                  setStep(category === 'bug' ? 'doing' : 'choose')
                }}
              >
                <ArrowLeft size={15} /> Back
              </button>

              <h3>
                {category === 'bug'
                  ? 'What happened? (Tap any that fit)'
                  : 'What kind of idea is it?'}
              </h3>

              <div className="kid-chip-list kid-chip-list--wrap">
                {(category === 'bug' ? BUG_QUICK_TAGS : IDEA_QUICK_TAGS).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`kid-chip ${selectedTags.includes(tag) ? 'is-active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <label className="feedback-textarea-label" htmlFor="kid-feedback-text">
                {category === 'bug'
                  ? 'Tell us a little more (optional):'
                  : 'Describe your awesome idea:'}
              </label>
              <textarea
                id="kid-feedback-text"
                className="feedback-textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === 'bug'
                    ? 'Example: I tried to put the 5 of Hearts on the 6...'
                    : 'Example: Let’s add Go Fish or a puppy card back!'
                }
              />

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={submitting || (selectedTags.length === 0 && !message.trim())}
              >
                <Sparkles size={16} />
                <span>{submitting ? 'Sending...' : 'Send Note!'}</span>
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="feedback-done">
              <CheckCircle2 size={44} className="done-icon" />
              <h3>Thank you!</h3>
              <p>Your note is saved so we can make Cozy Card Games even better.</p>
              <button type="button" className="btn-primary" onClick={resetAndClose}>
                Back to Cards
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
