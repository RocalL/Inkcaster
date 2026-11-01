// A simple greedy player used by the headless sim. It is not meant to play well, only to
// exercise the engine like a real player would: read the timeline, time wards, manage ink.

import { forecastEnemy, type EnemyAction } from './ai.ts'
import type { PlayerCommand, PlayerPolicy } from './sim.ts'
import { MAX_HAND_SIZE } from './hand.ts'
import { getSpell, isPlayerTurn, type CombatState } from './state.ts'
import { TICKS_PER_SECOND, durationTicks } from './time.ts'
import type { CombatContent, Effect, EnemySpellDef, SpellDef } from './types.ts'

/** Below this score the bot gathers ink instead of casting. */
const CAST_THRESHOLD = 0.5

export const greedyBot: PlayerPolicy = (state, content) => {
  if (!isPlayerTurn(state)) return []
  const forecast = forecastEnemy(content, state)

  let best: { command: PlayerCommand; score: number } | null = null
  for (const [index, card] of state.player.hand.entries()) {
    const spell = getSpell(content, card.spellId)
    if (spell.cost > state.player.ink) continue
    const score = scoreSpell(spell, state, content, forecast)
    if (!best || score > best.score) best = { command: { type: 'cast', slot: index }, score }
  }
  return best && best.score > CAST_THRESHOLD ? [best.command] : [{ type: 'wait' }]
}

/** Value per second of timeline spent, minus a share of the ink cost. */
function scoreSpell(
  spell: SpellDef,
  state: CombatState,
  content: CombatContent,
  forecast: EnemyAction[],
): number {
  const readyAt = state.tick + durationTicks(spell.time)
  const value = spell.effects.reduce(
    (sum, effect) => sum + scoreEffect(effect, state, content, forecast, readyAt),
    0,
  )
  return value / (spell.time + 0.5) - spell.cost * 0.6
}

function scoreEffect(
  effect: Effect,
  state: CombatState,
  content: CombatContent,
  forecast: EnemyAction[],
  readyAt: number,
): number {
  const { player, enemy } = state
  switch (effect.kind) {
    case 'damage': {
      if ((effect.target ?? 'enemy') === 'self') return -effect.amount
      // Damage into a ward is mostly wasted, but it does break the ward.
      return effect.amount - Math.min(enemy.shield, effect.amount) * 0.7
    }
    case 'heal': {
      const missing = player.maxHp - player.hp
      return Math.min(effect.amount, missing) * (player.hp < player.maxHp / 2 ? 1.2 : 0.4)
    }
    case 'shield': {
      // The ward is spent on the rival's next hit: only worth it if that hit lands soon.
      const hit = forecast.find((action) => damageOf(content, action) > 0)
      if (!hit || hit.landsAt === null) return effect.amount * 0.2
      const blocked = Math.min(effect.amount, damageOf(content, hit) - player.shield)
      const urgent = hit.landsAt <= readyAt + TICKS_PER_SECOND
      return Math.max(0, blocked) * (urgent ? 1.3 : 0.3)
    }
    case 'draw':
      return Math.min(effect.count, MAX_HAND_SIZE - player.hand.length) * 2
  }
}

function damageOf(content: CombatContent, action: EnemyAction): number {
  const spell: EnemySpellDef | undefined = content.enemy.spells.find(
    (candidate) => candidate.id === action.spellId,
  )
  if (!spell) return 0
  return spell.effects.reduce(
    (sum, effect) =>
      effect.kind === 'damage' && (effect.target ?? 'enemy') === 'enemy'
        ? sum + effect.amount
        : sum,
    0,
  )
}
