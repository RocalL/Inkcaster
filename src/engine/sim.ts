import { tickEnemy } from './ai.ts'
import { applyEffects } from './effects.ts'
import type { CombatEvent, RejectReason } from './events.ts'
import { tickHand, tickInk } from './hand.ts'
import { cloneState, createCombat, getSpell, type CombatState, type StepContext } from './state.ts'
import { TICK_MS, durationTicks } from './time.ts'
import type { CombatContent } from './types.ts'

export type PlayerCommand = { type: 'cast'; slot: number }

export interface StepResult {
  state: CombatState
  events: CombatEvent[]
}

/**
 * Advances the combat by one tick. Pure: the input state is never mutated.
 * Order: player commands, ink regen, hand cooldowns, enemy.
 */
export function step(
  content: CombatContent,
  state: CombatState,
  commands: readonly PlayerCommand[] = [],
): StepResult {
  if (state.status !== 'ongoing') return { state, events: [] }

  const ctx: StepContext = { content, state: cloneState(state), events: [] }
  for (const command of commands) {
    if (ctx.state.status !== 'ongoing') break
    castFromHand(ctx, command.slot)
  }
  tickInk(ctx.state.player)
  tickHand(ctx)
  if (ctx.state.status === 'ongoing') tickEnemy(ctx)
  ctx.state.tick += 1
  return { state: ctx.state, events: ctx.events }
}

function castFromHand(ctx: StepContext, slotIndex: number): void {
  const player = ctx.state.player
  const slot = player.hand[slotIndex]
  const reject = (reason: RejectReason) =>
    ctx.events.push({ type: 'commandRejected', slot: slotIndex, reason })

  if (!slot) return void reject('noSuchSlot')
  if (!slot.card) return void reject('slotRecharging')
  const spell = getSpell(ctx.content, slot.card.spellId)
  if (player.ink < spell.cost) return void reject('notEnoughInk')

  player.ink -= spell.cost
  player.discardPile.push(slot.card)
  slot.card = null
  slot.cooldown = durationTicks(spell.cooldown)
  ctx.events.push({ type: 'spellCast', side: 'player', spellId: spell.id, slot: slotIndex })
  applyEffects(ctx, 'player', spell.effects)
}

// --- Real-time driver -------------------------------------------------------

/** Caps catch-up after a long frame (tab switch, breakpoint) instead of fast-forwarding. */
export const MAX_STEPS_PER_FRAME = 10

/**
 * Converts real elapsed time into a whole number of fixed steps.
 * `speed` scales time: 1 normal, 0.5 slow time, 0 paused.
 */
export function advanceClock(
  accumulatorMs: number,
  elapsedMs: number,
  speed: number,
): { steps: number; accumulatorMs: number } {
  const total = accumulatorMs + Math.max(0, elapsedMs) * speed
  const steps = Math.floor(total / TICK_MS)
  if (steps > MAX_STEPS_PER_FRAME) return { steps: MAX_STEPS_PER_FRAME, accumulatorMs: 0 }
  return { steps, accumulatorMs: total - steps * TICK_MS }
}

// --- Headless harness -------------------------------------------------------

/** Decides the player's commands for the coming tick. Must be deterministic. */
export type PlayerPolicy = (state: CombatState, content: CombatContent) => PlayerCommand[]

export interface TimedEvent {
  tick: number
  event: CombatEvent
}

export interface DuelResult {
  outcome: 'won' | 'lost' | 'timeout'
  state: CombatState
  /** Only filled when `recordLog` is set. */
  log: TimedEvent[]
}

export interface RunDuelOptions {
  maxTicks?: number
  recordLog?: boolean
}

/** Runs a whole duel without rendering. Used by tests, the bot sim and the debug log. */
export function runDuel(
  content: CombatContent,
  seed: number,
  policy: PlayerPolicy,
  { maxTicks = 20 * 60 * 10, recordLog = false }: RunDuelOptions = {},
): DuelResult {
  let state = createCombat(content, seed)
  const log: TimedEvent[] = []

  while (state.status === 'ongoing' && state.tick < maxTicks) {
    const tick = state.tick
    const result = step(content, state, policy(state, content))
    state = result.state
    if (recordLog) log.push(...result.events.map((event) => ({ tick, event })))
  }

  const outcome = state.status === 'ongoing' ? 'timeout' : state.status
  return { outcome, state, log }
}
