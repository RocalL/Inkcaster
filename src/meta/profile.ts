// The player profile: gold, unlocks, rewrites, bindings, stats and the run in progress.
// Pure functions only; saving lives in save.ts. Every purchase returns a new profile.

import {
  ENEMIES,
  LOADOUTS,
  REWARD_POOL,
  RUN_CONTENT,
  WORDS_BY_ID,
  getEnemy,
  getLoadout,
} from '../data/index.ts'
import {
  BINDINGS,
  LOADOUT_UNLOCK_COST,
  REWRITE_COST,
  STARTING_LOADOUTS,
  STARTING_WORDS,
  WORD_UNLOCK_COST,
  type BindingDef,
  type BindingStat,
} from '../data/scriptorium.ts'
import {
  MAX_TIER,
  isRewritable,
  rewriteWords,
  type DuelContent,
  type RunContent,
  type RunState,
  type Tier,
} from '../engine/index.ts'

export interface ProfileStats {
  runs: number
  wins: number
  /** Most floors cleared in one run (the boss counts). */
  bestFloors: number
  goldEarned: number
}

export interface Profile {
  gold: number
  unlockedWords: string[]
  unlockedLoadouts: string[]
  /** Tier per rewritten word; missing means tier I. */
  rewrites: Record<string, Tier>
  /** Rank per binding; missing means not bought. */
  bindings: Record<string, number>
  stats: ProfileStats
  selectedLoadout: string
  /** The run in progress, saved between duels. */
  currentRun: { loadoutId: string; run: RunState } | null
}

export function newProfile(): Profile {
  return {
    gold: 0,
    unlockedWords: [...STARTING_WORDS],
    unlockedLoadouts: [...STARTING_LOADOUTS],
    rewrites: {},
    bindings: {},
    stats: { runs: 0, wins: 0, bestFloors: 0, goldEarned: 0 },
    selectedLoadout: STARTING_LOADOUTS[0] ?? 'apprentice',
    currentRun: null,
  }
}

// --- Prices -----------------------------------------------------------------

export type Purchase =
  | { type: 'word'; id: string }
  | { type: 'loadout'; id: string }
  | { type: 'rewrite'; id: string }
  | { type: 'binding'; id: string }

/** The price of a purchase, or null when it is not available (owned, maxed, unknown). */
export function priceOf(profile: Profile, purchase: Purchase): number | null {
  switch (purchase.type) {
    case 'word': {
      const reward = REWARD_POOL.find((candidate) => candidate.wordId === purchase.id)
      if (!reward || profile.unlockedWords.includes(purchase.id)) return null
      return WORD_UNLOCK_COST[reward.rarity]
    }
    case 'loadout':
      if (!LOADOUTS.some((loadout) => loadout.id === purchase.id)) return null
      return profile.unlockedLoadouts.includes(purchase.id) ? null : LOADOUT_UNLOCK_COST
    case 'rewrite': {
      const word = WORDS_BY_ID[purchase.id]
      if (!word || !isRewritable(word) || !profile.unlockedWords.includes(purchase.id)) return null
      const tier = profile.rewrites[purchase.id] ?? 1
      return tier >= MAX_TIER ? null : REWRITE_COST[(tier + 1) as 2 | 3]
    }
    case 'binding': {
      const binding = getBinding(purchase.id)
      return binding?.costs[profile.bindings[purchase.id] ?? 0] ?? null
    }
  }
}

/** Spends gold on a purchase. Returns the same profile when it is unavailable or too dear. */
export function buy(profile: Profile, purchase: Purchase): Profile {
  const price = priceOf(profile, purchase)
  if (price === null || price > profile.gold) return profile
  const paid = { ...profile, gold: profile.gold - price }
  switch (purchase.type) {
    case 'word':
      return { ...paid, unlockedWords: [...paid.unlockedWords, purchase.id] }
    case 'loadout': {
      const words = getLoadout(purchase.id).deck.filter((id) => !paid.unlockedWords.includes(id))
      return {
        ...paid,
        unlockedLoadouts: [...paid.unlockedLoadouts, purchase.id],
        unlockedWords: [...paid.unlockedWords, ...new Set(words)],
      }
    }
    case 'rewrite': {
      const tier = ((paid.rewrites[purchase.id] ?? 1) + 1) as Tier
      return { ...paid, rewrites: { ...paid.rewrites, [purchase.id]: tier } }
    }
    case 'binding': {
      const rank = (paid.bindings[purchase.id] ?? 0) + 1
      return { ...paid, bindings: { ...paid.bindings, [purchase.id]: rank } }
    }
  }
}

export function getBinding(id: string): BindingDef | undefined {
  return BINDINGS.find((binding) => binding.id === id)
}

/** Total bonus from bindings to one stat. */
export function bindingBonus(profile: Profile, stat: BindingStat): number {
  return BINDINGS.reduce(
    (sum, binding) =>
      binding.stat === stat ? sum + binding.perRank * (profile.bindings[binding.id] ?? 0) : sum,
    0,
  )
}

// --- Content with the profile applied ---------------------------------------

/** Run content with rewrites, bindings and only unlocked reward words. */
export function runContentFor(profile: Profile): RunContent {
  const economy = RUN_CONTENT.economy
  return {
    ...RUN_CONTENT,
    words: rewriteWords(RUN_CONTENT.words, profile.rewrites),
    player: {
      ...RUN_CONTENT.player,
      maxHp: RUN_CONTENT.player.maxHp + bindingBonus(profile, 'maxHp'),
      handSize: RUN_CONTENT.player.handSize + bindingBonus(profile, 'handSize'),
      startingWard: bindingBonus(profile, 'startingWard'),
    },
    rewardPool: RUN_CONTENT.rewardPool.filter((reward) =>
      profile.unlockedWords.includes(reward.wordId),
    ),
    economy: {
      ...economy,
      healAfterWin: economy.healAfterWin + bindingBonus(profile, 'healAfterWin'),
      goldMultiplier: (economy.goldMultiplier ?? 1) + bindingBonus(profile, 'goldMultiplier'),
      rewardChoices: economy.rewardChoices + bindingBonus(profile, 'rewardChoices'),
    },
  }
}

/** A practice duel with the profile's rewrites and bindings. */
export function practiceContentFor(
  profile: Profile,
  enemyId: string,
  loadoutId: string,
): DuelContent {
  const run = runContentFor(profile)
  return {
    words: run.words,
    player: { ...run.player, deck: getLoadout(loadoutId).deck },
    enemy: getEnemy(enemyId),
  }
}

// --- Runs -------------------------------------------------------------------

/** Records a finished run: banks its gold and updates the stats. */
export function bankRun(profile: Profile, run: RunState): Profile {
  if (run.phase !== 'won' && run.phase !== 'lost') return profile
  const won = run.phase === 'won'
  const floors = won ? run.path.length : run.floor
  return {
    ...profile,
    gold: profile.gold + run.gold,
    currentRun: null,
    stats: {
      runs: profile.stats.runs + 1,
      wins: profile.stats.wins + (won ? 1 : 0),
      bestFloors: Math.max(profile.stats.bestFloors, floors),
      goldEarned: profile.stats.goldEarned + run.gold,
    },
  }
}

/** Checks that every id in a profile still exists (content can change between versions). */
export function cleanProfile(profile: Profile): Profile {
  const loadouts = profile.unlockedLoadouts.filter((id) => LOADOUTS.some((l) => l.id === id))
  return {
    ...profile,
    unlockedWords: profile.unlockedWords.filter((id) => id in WORDS_BY_ID),
    unlockedLoadouts: loadouts.length > 0 ? loadouts : [...STARTING_LOADOUTS],
    rewrites: Object.fromEntries(
      Object.entries(profile.rewrites).filter(([id]) => id in WORDS_BY_ID),
    ),
    bindings: Object.fromEntries(
      Object.entries(profile.bindings).filter(([id]) => getBinding(id) !== undefined),
    ),
    selectedLoadout: loadouts.includes(profile.selectedLoadout)
      ? profile.selectedLoadout
      : (loadouts[0] ?? 'apprentice'),
    // A saved run that points at removed rivals cannot be resumed.
    currentRun:
      profile.currentRun &&
      profile.currentRun.run.path.every((id) => ENEMIES.some((e) => e.id === id))
        ? profile.currentRun
        : null,
  }
}
