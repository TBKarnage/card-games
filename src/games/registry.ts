export type GameId = 'solitaire' | 'memory-match' | 'go-fish' | 'trash'

export interface CardGameEntry {
  id: GameId
  title: string
  subtitle: string
  playersLabel: string
  ageLabel: string
  badge: string
  accent: string
  available: boolean
  bestScoreUnit: 'moves' | 'turns'
}

export const CARD_GAMES_REGISTRY: CardGameEntry[] = [
  {
    id: 'solitaire',
    title: 'Klondike Solitaire',
    subtitle: 'Sort all four suits from Ace to King at your own cozy pace.',
    playersLabel: '1 Player',
    ageLabel: 'Ages 7+',
    badge: 'Play Now',
    accent: '#c94a38',
    available: true,
    bestScoreUnit: 'moves',
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    subtitle: 'Flip pairs of illustrated cards on the living room table.',
    playersLabel: '1–2 Players',
    ageLabel: 'Ages 5+',
    badge: 'Play Now',
    accent: '#3d7057',
    available: true,
    bestScoreUnit: 'moves',
  },
  {
    id: 'go-fish',
    title: 'Cozy Go Fish',
    subtitle: 'Ask friendly tablebots for matching sets of four.',
    playersLabel: '2–4 Players',
    ageLabel: 'Ages 6+',
    badge: 'Play Now',
    accent: '#c47b2b',
    available: true,
    bestScoreUnit: 'turns',
  },
  {
    id: 'trash',
    title: 'Trash / Garbage',
    subtitle: 'Race to flip slots 1–10 face-up! Jacks are wild; Queens & Kings are trash.',
    playersLabel: '2–4 Players',
    ageLabel: 'Ages 6+',
    badge: 'Play Now',
    accent: '#7a4b94',
    available: true,
    bestScoreUnit: 'turns',
  },
]
