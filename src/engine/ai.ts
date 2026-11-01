// Rival inkcaster behaviour: idle, pick a spell, telegraph it on a cast bar, resolve it, repeat.

import { applyEffects } from './effects.ts'
import { nextRandom, type RngState } from './rng.ts'
import type { EnemyState, StepContext } from './state.ts'
import { durationTicks, secondsToTicks } from './time.ts'
import type { EnemyDef } from './types.ts'

export function tickEnemy(ctx: StepContext): void {
  const enemy = ctx.state.enemy
  const def = ctx.content.enemy

  if (enemy.cast) {
    enemy.cast.remainingTicks -= 1
    if (enemy.cast.remainingTicks > 0) return
    const spell = def.spells[enemy.cast.spellIndex]
    enemy.cast = null
    enemy.idleTicks = secondsToTicks(def.castGap)
    if (!spell) return
    ctx.events.push({ type: 'spellCast', side: 'enemy', spellId: spell.id })
    applyEffects(ctx, 'enemy', spell.effects)
    return
  }

  if (enemy.idleTicks > 0) enemy.idleTicks -= 1
  if (enemy.idleTicks > 0) return

  const [spellIndex, rng] = chooseEnemySpell(def, enemy, ctx.state.rng)
  ctx.state.rng = rng
  const spell = def.spells[spellIndex]
  if (!spell) return
  const castTicks = durationTicks(spell.castTime)
  enemy.cast = { spellIndex, totalTicks: castTicks, remainingTicks: castTicks }
  enemy.castsStarted += 1
  ctx.events.push({ type: 'enemyCastStart', spellId: spell.id, castTicks })
}

export function chooseEnemySpell(
  def: EnemyDef,
  enemy: EnemyState,
  rng: RngState,
): [spellIndex: number, next: RngState] {
  if (def.behaviour === 'rotation') return [enemy.castsStarted % def.spells.length, rng]

  const weights = def.spells.map((spell) => spell.weight ?? 1)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const [roll, next] = nextRandom(rng)
  let remaining = roll * total
  for (const [index, weight] of weights.entries()) {
    remaining -= weight
    if (remaining < 0) return [index, next]
  }
  return [weights.length - 1, next]
}
