// Rewrite: permanent word upgrades, tier I (as written) to tier III. One generic rule so that
// every word upgrades without extra data: each tier adds about 25% (at least +1) to the
// word's numbers. Words without numbers (Twice, Echo, Erase, Blot...) cannot be rewritten.

import type { Effect, WordDef } from './types.ts'

export type Tier = 1 | 2 | 3

export const MAX_TIER: Tier = 3

/** Bonus for `tier` on a base number: +25% per tier above I, rounded, at least +1 per tier. */
function bonus(base: number, tier: 2 | 3): number {
  const steps = tier - 1
  return Math.max(steps, Math.round(base * 0.25 * steps))
}

export function isRewritable(word: WordDef): boolean {
  return rewriteWord(word, 2) !== word
}

/** The word as it reads at `tier`. Returns the same object when nothing changes. */
export function rewriteWord(word: WordDef, tier: Tier): WordDef {
  if (tier === 1) return word
  const upgraded = upgradeNumbers(word, tier)
  return upgraded === word ? word : { ...upgraded, tier }
}

function upgradeNumbers(word: WordDef, tier: 2 | 3): WordDef {
  switch (word.kind) {
    case 'verb':
    case 'ink': {
      const effects = word.effects.map((effect) => rewriteEffect(effect, tier))
      return effects.some((effect, i) => effect !== word.effects[i]) ? { ...word, effects } : word
    }
    case 'modifier':
      return word.modifier.type === 'amplify'
        ? {
            ...word,
            modifier: { ...word.modifier, amount: word.modifier.amount + (tier - 1) },
          }
        : word
    case 'edit':
      return word
  }
}

function rewriteEffect(effect: Effect, tier: 2 | 3): Effect {
  switch (effect.kind) {
    case 'damage':
      // Scaling words get a flat +2 per tier: upgrading the per-point bonus would double them.
      return effect.scaling
        ? { ...effect, amount: effect.amount + 2 * (tier - 1) }
        : { ...effect, amount: effect.amount + bonus(effect.amount, tier) }
    case 'heal':
    case 'shield':
      return { ...effect, amount: effect.amount + bonus(effect.amount, tier) }
    case 'applyStatus':
      return { ...effect, stacks: effect.stacks + bonus(effect.stacks, tier) }
    case 'summon':
      return { ...effect, minion: { ...effect.minion, attack: effect.minion.attack + (tier - 1) } }
    case 'rally':
      return { ...effect, bonus: effect.bonus + (tier - 1) }
    case 'draw':
    case 'counter':
      return effect
  }
}

/** Applies every rewrite to a word table (ids keep pointing at their upgraded words). */
export function rewriteWords(
  words: Readonly<Record<string, WordDef>>,
  tiers: Readonly<Record<string, Tier>>,
): Record<string, WordDef> {
  return Object.fromEntries(
    Object.entries(words).map(([id, word]) => [id, rewriteWord(word, tiers[id] ?? 1)]),
  )
}
