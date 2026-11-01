import { drawCards } from './hand.ts'
import { getCombatant, type StepContext } from './state.ts'
import type { Effect, EffectTarget, Side } from './types.ts'

/** Resolves effects in order, stopping as soon as the combat ends. */
export function applyEffects(ctx: StepContext, caster: Side, effects: readonly Effect[]): void {
  for (const effect of effects) {
    if (ctx.state.status !== 'ongoing') return
    applyEffect(ctx, caster, effect)
  }
}

function applyEffect(ctx: StepContext, caster: Side, effect: Effect): void {
  switch (effect.kind) {
    case 'damage':
      return dealDamage(ctx, resolveTarget(caster, effect.target ?? 'enemy'), effect.amount)
    case 'heal':
      return heal(ctx, resolveTarget(caster, effect.target ?? 'self'), effect.amount)
    case 'shield':
      return addShield(ctx, resolveTarget(caster, effect.target ?? 'self'), effect.amount)
    case 'draw':
      // Enemies have no hand; the effect is ignored for them.
      if (caster === 'player') drawCards(ctx, effect.count)
      return
    default:
      return assertNever(effect)
  }
}

function resolveTarget(caster: Side, target: EffectTarget): Side {
  if (target === 'self') return caster
  return caster === 'player' ? 'enemy' : 'player'
}

/** A ward absorbs the next hit only: what it doesn't absorb comes off hp, and it is used up. */
function dealDamage(ctx: StepContext, target: Side, amount: number): void {
  const combatant = getCombatant(ctx.state, target)
  const absorbed = Math.min(combatant.shield, amount)
  const taken = Math.min(combatant.hp, amount - absorbed)
  combatant.shield = 0
  combatant.hp -= taken
  ctx.events.push({ type: 'damage', target, amount: taken, absorbed })

  if (combatant.hp === 0) {
    ctx.state.status = target === 'enemy' ? 'won' : 'lost'
    ctx.events.push({ type: 'death', side: target })
  }
}

function heal(ctx: StepContext, target: Side, amount: number): void {
  const combatant = getCombatant(ctx.state, target)
  const healed = Math.min(amount, combatant.maxHp - combatant.hp)
  combatant.hp += healed
  ctx.events.push({ type: 'heal', target, amount: healed })
}

function addShield(ctx: StepContext, target: Side, amount: number): void {
  getCombatant(ctx.state, target).shield += amount
  ctx.events.push({ type: 'shield', target, amount })
}

function assertNever(value: never): never {
  throw new Error(`Unhandled effect: ${JSON.stringify(value)}`)
}
