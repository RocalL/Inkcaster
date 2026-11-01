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
import { ASCENSION_GOLD_BONUS, ASCENSION_RULES, MAX_ASCENSION } from '../data/ascension.ts'
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
  /** Highest ascension level unlocked (0 = none). Winning at a level unlocks the next. */
  ascensionUnlocked: number
  selectedAscension: number
  /** The run in progress, saved between duels. */
  currentRun: SavedRun | null
}

export interface SavedRun {
  loadoutId: string
  ascension: number
  run: RunState
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
    ascensionUnlocked: 0,
    selectedAscension: 0,
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

/**
 * Run content with the profile applied: rewrites, bindings, only unlocked reward words, and
 * the chosen ascension level (each level includes the ones below it).
 */
export function runContentFor(profile: Profile, ascension = 0): RunContent {
  const economy = RUN_CONTENT.economy
  const bonus = (stat: BindingStat) => bindingBonus(profile, stat)
  const level = Math.max(0, Math.min(ascension, MAX_ASCENSION))
  const rules = ASCENSION_RULES
  const rivalHp = (1 + bonus('rivalHp')) * (level >= 1 ? 1 + rules.rivalHp : 1)
  const bossHp = (1 + bonus('bossHp')) * (level >= 3 ? 1 + rules.bossHp : 1)
  const rivalWard = level >= 5 ? rules.rivalWard : 0

  const startingStatuses = {
    focus: bonus('startingFocus'),
    thorns: bonus('startingThorns'),
    regen: bonus('startingRegen'),
  }
  return {
    ...RUN_CONTENT,
    words: rewriteWords(RUN_CONTENT.words, profile.rewrites),
    enemies:
      rivalWard > 0
        ? Object.fromEntries(
            Object.entries(RUN_CONTENT.enemies).map(([id, enemy]) => [
              id,
              { ...enemy, startingWard: (enemy.startingWard ?? 0) + rivalWard },
            ]),
          )
        : RUN_CONTENT.enemies,
    player: {
      ...RUN_CONTENT.player,
      maxHp: RUN_CONTENT.player.maxHp + bonus('maxHp'),
      handSize: RUN_CONTENT.player.handSize + bonus('handSize'),
      maxWords: RUN_CONTENT.player.maxWords + bonus('maxWords'),
      startingWard: bonus('startingWard'),
      startingStatuses,
    },
    rewardPool: RUN_CONTENT.rewardPool.filter((reward) =>
      profile.unlockedWords.includes(reward.wordId),
    ),
    economy: {
      ...economy,
      rivalHpScale: economy.rivalHpScale.map((scale) => scale * rivalHp),
      bossHpScale: (economy.bossHpScale ?? 1) * bossHp,
      healAfterWin: Math.max(
        0,
        economy.healAfterWin + bonus('healAfterWin') + (level >= 2 ? rules.healAfterWin : 0),
      ),
      healBeforeBoss: (economy.healBeforeBoss ?? 0) + bonus('healBeforeBoss'),
      goldMultiplier:
        (economy.goldMultiplier ?? 1) + bonus('goldMultiplier') + level * ASCENSION_GOLD_BONUS,
      deathGoldShare: Math.min(1, economy.deathGoldShare + bonus('deathGoldShare')),
      rewardChoices: Math.max(
        1,
        economy.rewardChoices + bonus('rewardChoices') + (level >= 4 ? rules.rewardChoices : 0),
      ),
      rarityWeights: {
        ...economy.rarityWeights,
        rare: economy.rarityWeights.rare + bonus('rareWeight'),
      },
    },
  }
}

/** The starting grimoire of a run: the loadout plus words from 'startWord' bindings. */
export function runDeckFor(profile: Profile, loadoutId: string): string[] {
  const extra = BINDINGS.flatMap((binding) =>
    binding.stat === 'startWord' && binding.wordId
      ? Array.from({ length: profile.bindings[binding.id] ?? 0 }, () => binding.wordId ?? '')
      : [],
  )
  return [...getLoadout(loadoutId).deck, ...extra]
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
    player: { ...run.player, deck: runDeckFor(profile, loadoutId) },
    enemy: getEnemy(enemyId),
  }
}

// --- Runs -------------------------------------------------------------------

/**
 * Records a finished run: banks its gold and updates the stats. Winning at the highest
 * unlocked ascension level unlocks the next one.
 */
export function bankRun(profile: Profile, run: RunState, ascension = 0): Profile {
  if (run.phase !== 'won' && run.phase !== 'lost') return profile
  const won = run.phase === 'won'
  const floors = won ? run.path.length : run.floor
  const unlocksNext = won && ascension >= profile.ascensionUnlocked
  return {
    ...profile,
    gold: profile.gold + run.gold,
    currentRun: null,
    ascensionUnlocked: unlocksNext
      ? Math.min(MAX_ASCENSION, ascension + 1)
      : profile.ascensionUnlocked,
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
    ascensionUnlocked: clamp(profile.ascensionUnlocked, 0, MAX_ASCENSION),
    selectedAscension: clamp(
      profile.selectedAscension,
      0,
      clamp(profile.ascensionUnlocked, 0, MAX_ASCENSION),
    ),
    // A saved run that points at removed rivals cannot be resumed.
    currentRun:
      profile.currentRun &&
      profile.currentRun.run.path.every((id) => ENEMIES.some((e) => e.id === id))
        ? profile.currentRun
        : null,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : min
}
