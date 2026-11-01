import { drawWords } from './hand.ts'
import { getFighter, type ActionContext } from './state.ts'
import type { Effect, EffectTarget, Side } from './types.ts'

/** Resolves effects in order, stopping as soon as the duel ends. */
export function applyEffects(ctx: ActionContext, caster: Side, effects: readonly Effect[]): void {
  for (const effect of effects) {
    if (ctx.state.status !== 'ongoing') return
    applyEffect(ctx, caster, effect)
  }
}

function applyEffect(ctx: ActionContext, caster: Side, effect: Effect): void {
  switch (effect.kind) {
    case 'damage':
      return dealDamage(ctx, resolveTarget(caster, effect.target ?? 'enemy'), effect.amount)
    case 'heal':
      return heal(ctx, resolveTarget(caster, effect.target ?? 'self'), effect.amount)
    case 'shield':
      return addWard(ctx, resolveTarget(caster, effect.target ?? 'self'), effect.amount)
    case 'applyStatus': {
      const target = resolveTarget(caster, effect.target ?? 'enemy')
      getFighter(ctx.state, target).statuses[effect.status] += effect.stacks
      ctx.events.push({
        type: 'statusApplied',
        target,
        status: effect.status,
        stacks: effect.stacks,
      })
      return
    }
    case 'draw':
      // The rival has no hand; the effect is ignored for it.
      if (caster === 'player') drawWords(ctx, effect.count)
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
export function dealDamage(
  ctx: ActionContext,
  target: Side,
  amount: number,
  { ignoreWard = false, source }: { ignoreWard?: boolean; source?: 'burn' } = {},
): void {
  const fighter = getFighter(ctx.state, target)
  const absorbed = ignoreWard ? 0 : Math.min(fighter.ward, amount)
  const taken = Math.min(fighter.hp, amount - absorbed)
  if (!ignoreWard) fighter.ward = 0
  fighter.hp -= taken
  ctx.events.push({ type: 'damage', target, amount: taken, absorbed, ...(source && { source }) })

  if (fighter.hp === 0) {
    ctx.state.status = target === 'enemy' ? 'won' : 'lost'
    ctx.events.push({ type: 'death', side: target })
  }
}

function heal(ctx: ActionContext, target: Side, amount: number): void {
  const fighter = getFighter(ctx.state, target)
  const healed = Math.min(amount, fighter.maxHp - fighter.hp)
  fighter.hp += healed
  ctx.events.push({ type: 'heal', target, amount: healed })
}

function addWard(ctx: ActionContext, target: Side, amount: number): void {
  getFighter(ctx.state, target).ward += amount
  ctx.events.push({ type: 'shield', target, amount })
}

/** Start of a fighter's turn: burn deals its stacks through wards, then fades by one. */
export function startTurn(ctx: ActionContext, side: Side): void {
  const fighter = getFighter(ctx.state, side)
  if (fighter.statuses.burn <= 0) return
  dealDamage(ctx, side, fighter.statuses.burn, { ignoreWard: true, source: 'burn' })
  fighter.statuses.burn -= 1
}

function assertNever(value: never): never {
  throw new Error(`Unhandled effect: ${JSON.stringify(value)}`)
}
