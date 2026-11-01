import type { DamageSource } from './events.ts'
import { drawWords } from './hand.ts'
import { MAX_MINIONS, getFighter, type ActionContext } from './state.ts'
import {
  HARMFUL_STATUSES,
  type Effect,
  type EffectTarget,
  type Scaling,
  type Side,
} from './types.ts'

/** What the resolver needs to know about the spell being cast. */
export interface SpellInfo {
  wordCount: number
  /** Share of damage dealt that heals the caster (Vampiric). */
  lifesteal?: number
}

/** Resolves effects in order, stopping as soon as the duel ends. */
export function applyEffects(
  ctx: ActionContext,
  caster: Side,
  effects: readonly Effect[],
  spell: SpellInfo,
): void {
  for (const effect of effects) {
    if (ctx.state.status !== 'ongoing') return
    applyEffect(ctx, caster, effect, spell)
  }
}

function applyEffect(ctx: ActionContext, caster: Side, effect: Effect, spell: SpellInfo): void {
  switch (effect.kind) {
    case 'damage': {
      const target = resolveTarget(caster, effect.target ?? 'enemy')
      const bonus = effect.scaling ? scaledBonus(ctx, caster, target, effect.scaling, spell) : 0
      const taken = dealDamage(ctx, target, effect.amount + bonus, {
        attacker: caster,
        pierce: effect.pierce,
      })
      const drained = Math.floor(taken * (spell.lifesteal ?? 0))
      if (drained > 0 && target !== caster && ctx.state.status === 'ongoing') {
        heal(ctx, caster, drained, 'lifesteal')
      }
      return
    }
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
    case 'summon': {
      const minions = getFighter(ctx.state, caster).minions
      if (minions.length >= MAX_MINIONS) return
      const { name, attack, turns } = effect.minion
      minions.push({ uid: ctx.state.nextMinionUid++, name, attack, turnsLeft: turns })
      ctx.events.push({ type: 'minionSummoned', side: caster, name, attack, turns })
      return
    }
    case 'rally':
      for (const minion of getFighter(ctx.state, caster).minions) {
        if (ctx.state.status !== 'ongoing') return
        dealDamage(ctx, opponent(caster), minion.attack + effect.bonus, {
          attacker: caster,
          source: 'minion',
        })
      }
      return
    case 'counter':
      // Only the player can cancel a spell: the rival's next spell is shown in advance.
      if (caster === 'player') ctx.state.enemy.countered = true
      return
    case 'cleanse': {
      const statuses = getFighter(ctx.state, caster).statuses
      for (const status of HARMFUL_STATUSES) statuses[status] = 0
      ctx.events.push({ type: 'cleansed', side: caster })
      return
    }
    default:
      return assertNever(effect)
  }
}

function opponent(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player'
}

function resolveTarget(caster: Side, target: EffectTarget): Side {
  return target === 'self' ? caster : opponent(caster)
}

function scaledBonus(
  ctx: ActionContext,
  caster: Side,
  target: Side,
  scaling: Scaling,
  spell: SpellInfo,
): number {
  const victim = getFighter(ctx.state, target)
  let count: number
  switch (scaling.per) {
    case 'targetBurn':
      count = victim.statuses.burn
      if (scaling.consume) victim.statuses.burn = 0
      break
    case 'targetChill':
      count = victim.statuses.chill
      if (scaling.consume) victim.statuses.chill = 0
      break
    case 'ownWard':
      count = getFighter(ctx.state, caster).ward
      break
    case 'spellWords':
      count = spell.wordCount
      break
  }
  return count * scaling.each
}

interface DamageOptions {
  /** Who dealt the hit; thorns strike back at them. */
  attacker?: Side
  source?: DamageSource
  /** Goes past the ward without using it up. */
  pierce?: boolean
}

/** Damage from statuses (and thorns) is not a "hit": no ward, no brand, no thorns. */
function isHit(source: DamageSource | undefined): boolean {
  return source === undefined || source === 'minion'
}

/**
 * A ward absorbs the next hit only: what it doesn't absorb comes off hp, and it is used up.
 * Burn and stain go through wards. A hit adds the target's brand (then clears it) and
 * triggers the target's thorns. Returns the hp actually lost.
 */
export function dealDamage(
  ctx: ActionContext,
  target: Side,
  amount: number,
  { attacker, source, pierce = false }: DamageOptions = {},
): number {
  const fighter = getFighter(ctx.state, target)
  const hit = isHit(source)
  const total = hit ? amount + fighter.statuses.brand : amount
  if (hit) fighter.statuses.brand = 0

  const ignoreWard = pierce || source === 'burn' || source === 'stain'
  const absorbed = ignoreWard ? 0 : Math.min(fighter.ward, total)
  const taken = Math.min(fighter.hp, total - absorbed)
  if (!ignoreWard) fighter.ward = 0
  fighter.hp -= taken
  ctx.events.push({ type: 'damage', target, amount: taken, absorbed, ...(source && { source }) })

  if (fighter.hp === 0) {
    ctx.state.status = target === 'enemy' ? 'won' : 'lost'
    ctx.events.push({ type: 'death', side: target })
    return taken
  }
  const thorns = fighter.statuses.thorns
  if (attacker && attacker !== target && hit && thorns > 0) {
    dealDamage(ctx, attacker, thorns, { source: 'thorns' })
  }
  return taken
}

function heal(
  ctx: ActionContext,
  target: Side,
  amount: number,
  source?: 'regen' | 'lifesteal',
): void {
  const fighter = getFighter(ctx.state, target)
  const healed = Math.min(amount, fighter.maxHp - fighter.hp)
  fighter.hp += healed
  ctx.events.push({ type: 'heal', target, amount: healed, ...(source && { source }) })
}

function addWard(ctx: ActionContext, target: Side, amount: number): void {
  getFighter(ctx.state, target).ward += amount
  ctx.events.push({ type: 'shield', target, amount })
}

/**
 * Start of a fighter's turn: burn deals its stacks through wards, then halves (so big stacks
 * stay linear, not quadratic). Regen heals, then fades by one. Thorns fade by one.
 * Inspire draws extra words (player only), then clears.
 */
export function startTurnStatuses(ctx: ActionContext, side: Side): void {
  const statuses = getFighter(ctx.state, side).statuses
  if (statuses.inspire > 0) {
    if (side === 'player') drawWords(ctx, statuses.inspire)
    statuses.inspire = 0
  }
  if (statuses.burn > 0) {
    dealDamage(ctx, side, statuses.burn, { source: 'burn' })
    statuses.burn = Math.floor(statuses.burn / 2)
  }
  if (ctx.state.status !== 'ongoing') return
  if (statuses.regen > 0) {
    heal(ctx, side, statuses.regen, 'regen')
    statuses.regen -= 1
  }
  if (statuses.thorns > 0) statuses.thorns -= 1
}

/**
 * Stain: casting a spell hurts its caster through wards, then Stain drops by 1.
 * Returns false if that was fatal.
 */
export function stainOnCast(ctx: ActionContext, side: Side): boolean {
  const statuses = getFighter(ctx.state, side).statuses
  if (statuses.stain <= 0) return true
  dealDamage(ctx, side, statuses.stain, { source: 'stain' })
  statuses.stain -= 1
  return ctx.state.status === 'ongoing'
}

/** End of a fighter's turn: its minions strike, then age; expired ones fade. */
export function endTurnMinions(ctx: ActionContext, side: Side): void {
  const fighter = getFighter(ctx.state, side)
  for (const minion of fighter.minions) {
    if (ctx.state.status !== 'ongoing') return
    dealDamage(ctx, opponent(side), minion.attack, { attacker: side, source: 'minion' })
    minion.turnsLeft -= 1
  }
  for (const minion of fighter.minions) {
    if (minion.turnsLeft <= 0) ctx.events.push({ type: 'minionFaded', side, name: minion.name })
  }
  fighter.minions = fighter.minions.filter((minion) => minion.turnsLeft > 0)
}

function assertNever(value: never): never {
  throw new Error(`Unhandled effect: ${JSON.stringify(value)}`)
}
