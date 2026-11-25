export type TableThemeId = 'warm-oak' | 'sage-felt' | 'cozy-quilt' | 'evening-linen'
export type CardBackId = 'botanical' | 'tartan' | 'starry-night' | 'meadow'
export type DrawCount = 1 | 3
export type SolitaireDifficulty = 'easy' | 'normal' | 'hard'

export const APP_DEFAULTS = {
  appName: 'Cozy Card Games',
  slug: 'card-games',
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
  /**
   * Default PIN for the hidden Parent Area.
   * Never display this PIN in the UI.
   */
  parentPin: '1234',
  /**
   * Optional GitHub repo in "owner/repo" format (e.g. "TBKarnage/card-games")
   * for sending Bug & Idea reports as prefilled GitHub Issues.
   * Can also be overridden in the PIN-locked Parent Area.
   */
  githubIssuesRepo: '',
  /**
   * Optional webhook endpoint for Bug/Idea reports (POST JSON).
   * Can also be overridden in the PIN-locked Parent Area.
   */
  parentWebhookUrl: '',
  defaultThemeId: 'warm-oak' as TableThemeId,
  defaultCardBackId: 'botanical' as CardBackId,
  defaultSoundEnabled: true,
  defaultLargePrint: false,
  defaultDrawCount: 1 as DrawCount,
  defaultDifficulty: 'easy' as SolitaireDifficulty,
  storageKey: 'cozy-card-games:v1:profile',
} as const
