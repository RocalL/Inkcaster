// A simple greedy player used by the headless sim. It is not meant to play well, only to
// exercise the engine like a real player would: react to telegraphs, spend ink, cycle pages.

import type { PlayerCommand, PlayerPolicy } from './sim.ts'
import { getSpell, type CombatState } from './state.ts'
import type { CombatContent, Effect, SpellDef } from './types.ts'

/** The bot acts every few ticks, roughly a human reaction time. */
const REACTION_TICKS = 5

export const greedyBot: PlayerPolicy = (state, content) => {
  if (state.tick % REACTION_TICKS !== 0) return []

  let best: { command: PlayerCommand; score: number } | null = null
  for (const [index, slot] of state.player.hand.entries()) {
    if (!slot.card) continue
    const spell = getSpell(content, slot.card.spellId)
    if (spell.cost > state.player.ink) continue
    const score = scoreSpell(spell, state, content)
    if (score > 0 && (!best || score > best.score)) {
      best = { command: { type: 'cast', slot: index }, score }
    }
  }
  return best ? [best.command] : []
}

function scoreSpell(spell: SpellDef, state: CombatState, content: CombatContent): number {
  const value = spell.effects.reduce((sum, effect) => sum + scoreEffect(effect, state, content), 0)
  return value - spell.cost * 0.5
}

function scoreEffect(effect: Effect, state: CombatState, content: CombatContent): number {
  const player = state.player
  switch (effect.kind) {
    case 'damage':
      return (effect.target ?? 'enemy') === 'enemy' ? effect.amount : -effect.amount
    case 'heal': {
      const missing = player.maxHp - player.hp
      return Math.min(effect.amount, missing) * (player.hp < player.maxHp / 2 ? 1.5 : 0.5)
    }
    case 'shield': {
      const uncovered = incomingDamage(state, content) - player.shield
      return uncovered > 0 ? Math.min(effect.amount, uncovered) * 1.5 : effect.amount * 0.25
    }
    case 'draw':
      return player.hand.some((slot) => !slot.card) ? effect.count * 2 : 0
  }
}

/** Damage the telegraphed enemy cast will deal to the player. */
function incomingDamage(state: CombatState, content: CombatContent): number {
  const cast = state.enemy.cast
  if (!cast) return 0
  const spell = content.enemy.spells[cast.spellIndex]
  if (!spell) return 0
  return spell.effects.reduce(
    (sum, effect) =>
      effect.kind === 'damage' && (effect.target ?? 'enemy') === 'enemy'
        ? sum + effect.amount
        : sum,
    0,
  )
}
