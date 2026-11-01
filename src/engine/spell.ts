// Spell composition: turns a sentence of word ids into effects. Pure and shared by the player,
// the rival and the UI preview.

import { getWord } from './state.ts'
import type { DuelContent, Effect } from './types.ts'

export type ComposeResult =
  | {
      ok: true
      /** Effects of a single cast, before repetition. */
      once: Effect[]
      /** How many times `once` is cast. */
      times: number
      /** `once` repeated `times` times: what actually resolves. */
      effects: Effect[]
      /** Number of edit words (Erase...) in the sentence. */
      edits: number
      /** The spell will be cast again at the start of the caster's next turn. */
      echo: boolean
      /** Extra word slots granted by expand modifiers (Verbose). */
      extraWords: number
      /** Number of words in the sentence; counted by 'spellWords' scaling. */
      wordCount: number
      /** Share of the spell's damage the caster heals (Vampiric). */
      lifesteal: number
    }
  | { ok: false; reason: 'needOneVerb' }

export interface ComposeOptions {
  /** Added to the amplify total, e.g. from the caster's Focus. */
  bonusAmplify?: number
}

/**
 * Rules: exactly one verb. Amplify modifiers (and Focus) add to the verb's numbers.
 * Ink words append their effects. Repeat modifiers multiply the number of casts.
 * Word order does not matter (yet).
 */
export function composeSpell(
  content: DuelContent,
  wordIds: readonly string[],
  { bonusAmplify = 0 }: ComposeOptions = {},
): ComposeResult {
  const words = wordIds.map((id) => getWord(content, id))
  const verbs = words.flatMap((word) => (word.kind === 'verb' ? [word] : []))
  const verb = verbs[0]
  if (!verb || verbs.length > 1) return { ok: false, reason: 'needOneVerb' }

  let amplify = bonusAmplify
  let times = 1
  let echo = false
  let extraWords = 0
  let edits = 0
  let intensify = 0
  let lifesteal = 0
  let pierce = false
  const inkEffects: Effect[] = []
  for (const word of words) {
    if (word.kind === 'modifier') {
      const modifier = word.modifier
      if (modifier.type === 'amplify') amplify += modifier.amount
      else if (modifier.type === 'repeat') times *= modifier.times
      else if (modifier.type === 'echo') echo = true
      else if (modifier.type === 'expand') extraWords += modifier.words
      else if (modifier.type === 'intensify') intensify += modifier.amount
      else if (modifier.type === 'lifesteal') lifesteal += modifier.share
      else pierce = true
    } else if (word.kind === 'ink') {
      inkEffects.push(...word.effects)
    } else if (word.kind === 'edit') {
      edits += 1
    }
  }

  const once = [...verb.effects.map((effect) => amplifyEffect(effect, amplify)), ...inkEffects].map(
    (effect) => {
      if (effect.kind === 'applyStatus' && intensify > 0) {
        return { ...effect, stacks: effect.stacks + intensify }
      }
      if (effect.kind === 'damage' && pierce) return { ...effect, pierce: true }
      return effect
    },
  )
  const effects = Array.from({ length: times }, () => once).flat()
  return {
    ok: true,
    once,
    times,
    effects,
    edits,
    echo,
    extraWords,
    wordCount: words.length,
    lifesteal: Math.min(1, lifesteal),
  }
}

function amplifyEffect(effect: Effect, amount: number): Effect {
  if (amount === 0) return effect
  switch (effect.kind) {
    case 'damage':
    case 'shield':
    case 'heal':
      return { ...effect, amount: effect.amount + amount }
    case 'applyStatus':
      return { ...effect, stacks: effect.stacks + amount }
    case 'rally':
      return { ...effect, bonus: effect.bonus + amount }
    default:
      return effect
  }
}

/** Chill on the caster weakens every hit of its next spell. */
export function applyChill(effects: readonly Effect[], chill: number): Effect[] {
  if (chill <= 0) return [...effects]
  return effects.map((effect) =>
    effect.kind === 'damage' && (effect.target ?? 'enemy') === 'enemy'
      ? { ...effect, amount: Math.max(0, effect.amount - chill) }
      : effect,
  )
}
