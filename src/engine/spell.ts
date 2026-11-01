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
    }
  | { ok: false; reason: 'needOneVerb' }

/**
 * Rules: exactly one verb. Amplify modifiers add to the verb's damage/shield/heal numbers.
 * Ink words append their effects. Repeat modifiers multiply the number of casts.
 * Word order does not matter (yet).
 */
export function composeSpell(content: DuelContent, wordIds: readonly string[]): ComposeResult {
  const words = wordIds.map((id) => getWord(content, id))
  const verbs = words.flatMap((word) => (word.kind === 'verb' ? [word] : []))
  const verb = verbs[0]
  if (!verb || verbs.length > 1) return { ok: false, reason: 'needOneVerb' }

  let amplify = 0
  let times = 1
  const inkEffects: Effect[] = []
  let edits = 0
  for (const word of words) {
    if (word.kind === 'modifier') {
      if (word.modifier.type === 'amplify') amplify += word.modifier.amount
      else times *= word.modifier.times
    } else if (word.kind === 'ink') {
      inkEffects.push(...word.effects)
    } else if (word.kind === 'edit') {
      edits += 1
    }
  }

  const once = [...verb.effects.map((effect) => amplifyEffect(effect, amplify)), ...inkEffects]
  const effects = Array.from({ length: times }, () => once).flat()
  return { ok: true, once, times, effects, edits }
}

function amplifyEffect(effect: Effect, amount: number): Effect {
  if (amount === 0) return effect
  if (effect.kind === 'damage' || effect.kind === 'shield' || effect.kind === 'heal') {
    return { ...effect, amount: effect.amount + amount }
  }
  return effect
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
