import type { RewardDef, RunEconomy } from '../engine/index.ts'

// Run structure: six duels in rising tiers, then the boss. Numbers tuned with `npm run sim -- --runs`.

/** Candidate rivals per floor; one is picked per floor when the run starts. */
export const RUN_FLOORS: readonly (readonly string[])[] = [
  ['ash_adept', 'frost_scribe'],
  ['ash_adept', 'frost_scribe'],
  ['ash_adept', 'frost_scribe', 'inkling_mother'],
  ['bramble_warden', 'inkling_mother'],
  ['bramble_warden', 'inkling_mother', 'frost_scribe'],
  ['bramble_warden', 'inkling_mother', 'ash_adept'],
]

export const RUN_BOSS_ID = 'archivist'

/** Words that can be offered after a win. */
export const REWARD_POOL: readonly RewardDef[] = [
  { wordId: 'strike', rarity: 'common' },
  { wordId: 'ward', rarity: 'common' },
  { wordId: 'mend', rarity: 'common' },
  { wordId: 'drain', rarity: 'common' },
  { wordId: 'twice', rarity: 'common' },
  { wordId: 'greater', rarity: 'common' },
  { wordId: 'fire', rarity: 'common' },
  { wordId: 'ice', rarity: 'common' },
  { wordId: 'arcane', rarity: 'common' },
  { wordId: 'erase', rarity: 'common' },
  { wordId: 'kindle', rarity: 'uncommon' },
  { wordId: 'ignite', rarity: 'uncommon' },
  { wordId: 'freeze', rarity: 'uncommon' },
  { wordId: 'shatter', rarity: 'uncommon' },
  { wordId: 'call', rarity: 'uncommon' },
  { wordId: 'rally', rarity: 'uncommon' },
  { wordId: 'focus', rarity: 'uncommon' },
  { wordId: 'study', rarity: 'uncommon' },
  { wordId: 'bulwark', rarity: 'uncommon' },
  { wordId: 'riposte', rarity: 'uncommon' },
  { wordId: 'spirit', rarity: 'uncommon' },
  { wordId: 'thorn', rarity: 'uncommon' },
  { wordId: 'verdant', rarity: 'uncommon' },
  { wordId: 'echo', rarity: 'uncommon' },
  { wordId: 'thrice', rarity: 'rare' },
  { wordId: 'verbose', rarity: 'rare' },
  { wordId: 'blot', rarity: 'rare' },
  { wordId: 'litany', rarity: 'rare' },
]

export const RUN_ECONOMY: RunEconomy = {
  goldBase: 10,
  goldPerFloor: 4,
  bossGold: 60,
  deathGoldShare: 0.5,
  healAfterWin: 0.4,
  rivalHpScale: [0.5, 0.6, 0.7, 0.75, 0.8, 0.9],
  rewardChoices: 3,
  rarityWeights: { common: 6, uncommon: 3, rare: 1 },
}
