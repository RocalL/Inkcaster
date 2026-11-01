// Rival inkcaster behaviour: idle, pick a spell, telegraph it on a cast bar, resolve it, repeat.

import { applyEffects } from './effects.ts'
import { nextRandom, type RngState } from './rng.ts'
import type { CombatState, EnemyState, StepContext } from './state.ts'
import { durationTicks, secondsToTicks } from './time.ts'
import type { CombatContent, EnemyDef } from './types.ts'

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

export interface EnemyAction {
  /** null when a 'weighted' rival hasn't picked its spell yet. */
  spellId: string | null
  /** Clock tick at which the cast bar appears. */
  startsAt: number
  /** Clock tick by which the effects have resolved; null when the spell isn't known yet. */
  landsAt: number | null
}

/**
 * The rival's next actions on the timeline, as far as they can be known: the current cast,
 * then for 'rotation' rivals the next ones in order. An action "lands before your turn"
 * when `landsAt <= player.readyAt`.
 */
export function forecastEnemy(
  content: CombatContent,
  state: CombatState,
  count = 3,
): EnemyAction[] {
  const def = content.enemy
  const enemy = state.enemy
  const gap = Math.max(1, secondsToTicks(def.castGap))
  const actions: EnemyAction[] = []

  let nextStart: number
  if (enemy.cast) {
    const landsAt = state.tick + enemy.cast.remainingTicks
    const spell = def.spells[enemy.cast.spellIndex]
    actions.push({ spellId: spell?.id ?? null, startsAt: landsAt - enemy.cast.totalTicks, landsAt })
    nextStart = landsAt + gap
  } else {
    nextStart = state.tick + Math.max(1, enemy.idleTicks)
  }

  let castsStarted = enemy.castsStarted
  while (actions.length < count) {
    if (def.behaviour !== 'rotation') {
      actions.push({ spellId: null, startsAt: nextStart, landsAt: null })
      break
    }
    const spell = def.spells[castsStarted % def.spells.length]
    if (!spell) break
    const landsAt = nextStart + durationTicks(spell.castTime)
    actions.push({ spellId: spell.id, startsAt: nextStart, landsAt })
    castsStarted += 1
    nextStart = landsAt + gap
  }
  return actions
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
