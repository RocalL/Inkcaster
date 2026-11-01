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

/** Run or duel stats a Binding can change. */
export type BindingStat =
  | 'maxHp'
  | 'handSize'
  | 'maxWords'
  | 'startingWard'
  | 'startingFocus'
  | 'startingThorns'
  | 'startingRegen'
  | 'healAfterWin'
  | 'healBeforeBoss'
  | 'goldMultiplier'
  | 'deathGoldShare'
  | 'rewardChoices'
  | 'rareWeight'
  | 'rivalHp'
  | 'bossHp'
  /** Adds `wordId` to the starting grimoire of every run, once per rank. */
  | 'startWord'

export interface BindingDef {
  id: string
  name: string
  /** Rules text for one rank. */
  description: string
  stat: BindingStat
  /** Added to the stat per rank (fractions for shares and multipliers). */
  perRank: number
  /** For 'startWord'. */
  wordId?: string
  /** Price of each rank in order; its length is the number of ranks. */
  costs: readonly number[]
}

export const BINDINGS: readonly BindingDef[] = [
  // Body
  {
    id: 'vellum_skin',
    name: 'Vellum Skin',
    description: '+5 max HP',
    stat: 'maxHp',
    perRank: 5,
    costs: [40, 80, 120],
  },
  {
    id: 'thick_binding',
    name: 'Thick Binding',
    description: '+10 max HP',
    stat: 'maxHp',
    perRank: 10,
    costs: [220],
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
    id: 'bramble_spine',
    name: 'Bramble Spine',
    description: 'Start each duel with Thorns 1',
    stat: 'startingThorns',
    perRank: 1,
    costs: [60, 120],
  },
  {
    id: 'living_ink',
    name: 'Living Ink',
    description: 'Start each duel with Regen 2',
    stat: 'startingRegen',
    perRank: 2,
    costs: [60, 120],
  },
  {
    id: 'focused_mind',
    name: 'Focused Mind',
    description: 'Start each duel with Focus 2',
    stat: 'startingFocus',
    perRank: 2,
    costs: [70, 140],
  },
  // Recovery
  {
    id: 'mending_thread',
    name: 'Mending Thread',
    description: 'Heal 10% more of your max HP after each win',
    stat: 'healAfterWin',
    perRank: 0.1,
    costs: [50, 100],
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    description: 'Heal 15 before the boss',
    stat: 'healBeforeBoss',
    perRank: 15,
    costs: [80],
  },
  // Writing
  {
    id: 'deep_inkwell',
    name: 'Deep Inkwell',
    description: 'Hold one more word in hand',
    stat: 'handSize',
    perRank: 1,
    costs: [160],
  },
  {
    id: 'long_hand',
    name: 'Long Hand',
    description: 'Every spell may hold one more word',
    stat: 'maxWords',
    perRank: 1,
    costs: [300],
  },
  {
    id: 'spare_eraser',
    name: 'Spare Eraser',
    description: 'Start every run with an extra Erase',
    stat: 'startWord',
    wordId: 'erase',
    perRank: 1,
    costs: [60],
  },
  {
    id: 'bold_margin',
    name: 'Bold Margin',
    description: 'Start every run with an extra Greater',
    stat: 'startWord',
    wordId: 'greater',
    perRank: 1,
    costs: [70],
  },
  {
    id: 'double_line',
    name: 'Double Line',
    description: 'Start every run with an extra Twice',
    stat: 'startWord',
    wordId: 'twice',
    perRank: 1,
    costs: [80],
  },
  // Fortune
  {
    id: 'gilded_margins',
    name: 'Gilded Margins',
    description: '+20% gold',
    stat: 'goldMultiplier',
    perRank: 0.2,
    costs: [40, 80],
  },
  {
    id: 'salvage',
    name: 'Salvage',
    description: 'Keep 15% more of your gold when you die',
    stat: 'deathGoldShare',
    perRank: 0.15,
    costs: [50, 100],
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
    id: 'rare_ink',
    name: 'Rare Ink',
    description: 'Rare words are offered more often',
    stat: 'rareWeight',
    perRank: 1,
    costs: [60, 120],
  },
  // The world
  {
    id: 'dulled_rivals',
    name: 'Dulled Rivals',
    description: 'Rivals have 5% less HP',
    stat: 'rivalHp',
    perRank: -0.05,
    costs: [90, 180],
  },
  {
    id: 'cracked_crown',
    name: 'Cracked Crown',
    description: 'Bosses have 10% less HP',
    stat: 'bossHp',
    perRank: -0.1,
    costs: [120],
  },
  {
    id: 'ink_reserve',
    name: 'Ink Reserve',
    description: 'Start every run with an extra Ward',
    stat: 'startWord',
    wordId: 'ward',
    perRank: 1,
    costs: [45],
  },
]
