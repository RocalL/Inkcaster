// Rival inkcaster behaviour: it always shows the sentence it will cast next.

import { nextRandom, type RngState } from './rng.ts'
import type { ActionContext, EnemyState } from './state.ts'
import type { EnemyDef } from './types.ts'

/** Picks the rival's next spell and reveals it as its intent. */
export function chooseIntent(ctx: ActionContext): void {
  const def = ctx.content.enemy
  const [index, rng] = chooseEnemySpell(def, ctx.state.enemy, ctx.state.rng)
  ctx.state.rng = rng
  const words = def.spells[index]?.words ?? []
  ctx.state.enemy.intent = words.map((wordId) => ({ wordId, erased: false }))
  ctx.events.push({ type: 'intent', words: [...words] })
}

export function chooseEnemySpell(
  def: EnemyDef,
  enemy: EnemyState,
  rng: RngState,
): [spellIndex: number, next: RngState] {
  if (def.behaviour === 'rotation') return [enemy.spellsCast % def.spells.length, rng]

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
