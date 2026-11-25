import type { CardBackId, TableThemeId } from './appDefaults'

export interface TableTheme {
  id: TableThemeId
  name: string
  description: string
  unlockWins: number
  swatch: string
  textColor: string
}

export interface CardBackTheme {
  id: CardBackId
  name: string
  description: string
  unlockWins: number
  primaryColor: string
  accentColor: string
}

export const TABLE_THEMES: TableTheme[] = [
  {
    id: 'warm-oak',
    name: 'Warm Oak',
    description: 'Honeyed kitchen table woodgrain',
    unlockWins: 0,
    swatch: 'linear-gradient(135deg, #6b482f 0%, #4d321f 100%)',
    textColor: '#fff7eb',
  },
  {
    id: 'sage-felt',
    name: 'Sage Felt',
    description: 'Soft parlor baize with warm trim',
    unlockWins: 0,
    swatch: 'linear-gradient(135deg, #3c6451 0%, #274537 100%)',
    textColor: '#f4faf6',
  },
  {
    id: 'cozy-quilt',
    name: 'Cozy Quilt',
    description: 'Terracotta & linen patchwork',
    unlockWins: 1,
    swatch: 'linear-gradient(135deg, #9d533f 0%, #703526 100%)',
    textColor: '#fff6f0',
  },
  {
    id: 'evening-linen',
    name: 'Midnight Velvet',
    description: 'Deep twilight blue with brass glow',
    unlockWins: 3,
    swatch: 'linear-gradient(135deg, #2d3752 0%, #1b2235 100%)',
    textColor: '#f5f7ff',
  },
]

export const CARD_BACKS: CardBackTheme[] = [
  {
    id: 'botanical',
    name: 'Botanical Leaf',
    description: 'Forest green & cream sprigs',
    unlockWins: 0,
    primaryColor: '#2d5a43',
    accentColor: '#e9d8b4',
  },
  {
    id: 'tartan',
    name: 'Cozy Tartan',
    description: 'Warm fireside plaid weave',
    unlockWins: 0,
    primaryColor: '#9b3d32',
    accentColor: '#f3dfb9',
  },
  {
    id: 'starry-night',
    name: 'Starry Night',
    description: 'Twilight sky & golden stars',
    unlockWins: 1,
    primaryColor: '#243254',
    accentColor: '#f4c96b',
  },
  {
    id: 'meadow',
    name: 'Wildflower',
    description: 'Sunny ochre & sage blossoms',
    unlockWins: 2,
    primaryColor: '#b56e2d',
    accentColor: '#fff4dc',
  },
]

export function isThemeUnlocked(unlockWins: number, totalWins: number): boolean {
  return totalWins >= unlockWins
}
