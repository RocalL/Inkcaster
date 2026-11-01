import type { Rarity } from '../engine/index.ts'

// What gold buys between runs. Prices are tuned with `npm run sim -- --progression`.

/** Words every new profile has: the Apprentice grimoire's words. */
export const STARTING_WORDS: readonly string[] = [
  'strike',
  'ward',
  'mend',
  'drain',
  'twice',
  'greater',
  'fire',
  'ice',
  'arcane',
  'erase',
]

export const STARTING_LOADOUTS: readonly string[] = ['apprentice']

/** Unlocking a word adds it to the reward pool. */
export const WORD_UNLOCK_COST: Record<Rarity, number> = { common: 25, uncommon: 40, rare: 70 }

/** Unlocking a loadout also unlocks every word in its grimoire. */
export const LOADOUT_UNLOCK_COST = 100

/** Cost to rewrite a word up to tier II, then tier III. */
export const REWRITE_COST: Record<2 | 3, number> = { 2: 30, 3: 60 }

/** Run or duel stats a Binding can raise. */
export type BindingStat =
  'maxHp' | 'handSize' | 'startingWard' | 'healAfterWin' | 'goldMultiplier' | 'rewardChoices'

export interface BindingDef {
  id: string
  name: string
  /** Rules text for one rank. */
  description: string
  stat: BindingStat
  /** Added to the stat per rank (healAfterWin and goldMultiplier are fractions). */
  perRank: number
  /** Price of each rank in order; its length is the number of ranks. */
  costs: readonly number[]
}

export const BINDINGS: readonly BindingDef[] = [
  {
    id: 'vellum_skin',
    name: 'Vellum Skin',
    description: '+5 max HP',
    stat: 'maxHp',
    perRank: 5,
    costs: [40, 80, 120],
  },
  {
    id: 'warded_cover',
    name: 'Warded Cover',
    description: 'Start each duel with Ward 3',
    stat: 'startingWard',
    perRank: 3,
    costs: [50, 100],
  },
  {
    id: 'mending_thread',
    name: 'Mending Thread',
    description: 'Heal 10% more of your max HP after each win',
    stat: 'healAfterWin',
    perRank: 0.1,
    costs: [50, 100],
  },
  {
    id: 'gilded_margins',
    name: 'Gilded Margins',
    description: '+20% gold',
    stat: 'goldMultiplier',
    perRank: 0.2,
    costs: [40, 80],
  },
  {
    id: 'wide_shelf',
    name: 'Wide Shelf',
    description: 'One more word offered after each win',
    stat: 'rewardChoices',
    perRank: 1,
    costs: [90],
  },
  {
    id: 'deep_inkwell',
    name: 'Deep Inkwell',
    description: 'Hold one more word in hand',
    stat: 'handSize',
    perRank: 1,
    costs: [160],
  },
]
