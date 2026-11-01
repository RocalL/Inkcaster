import { tickEnemy } from './ai.ts'
import { applyEffects } from './effects.ts'
import type { CombatEvent } from './events.ts'
import { playFromHand, tickInk } from './hand.ts'
import {
  cloneState,
  createCombat,
  getSpell,
  isPlayerTurn,
  type CombatState,
  type StepContext,
} from './state.ts'
import { TICK_MS, durationTicks } from './time.ts'
import type { CombatContent } from './types.ts'

export type PlayerCommand = { type: 'cast'; slot: number } | { type: 'wait' }

/** Timeline cost of "Gather ink": the player lets this much time pass. */
export const WAIT_SECONDS = 1

export interface StepResult {
  state: CombatState
  events: CombatEvent[]
}

/**
 * Advances the combat by one tick. Pure: the input state is never mutated.
 *
 * Timeline turns: once the clock reaches `player.readyAt`, time is frozen until a valid
 * command arrives. A cast or a wait moves `readyAt` forward by its time cost.
 * Order inside a tick: player command, ink regen, enemy.
 */
export function step(
  content: CombatContent,
  state: CombatState,
  commands: readonly PlayerCommand[] = [],
): StepResult {
  if (state.status !== 'ongoing') return { state, events: [] }
  const waitingForPlayer = isPlayerTurn(state)
  if (waitingForPlayer && commands.length === 0) return { state, events: [] }

  const ctx: StepContext = { content, state: cloneState(state), events: [] }
  let acted = false
  for (const command of commands) {
    if (ctx.state.status !== 'ongoing') break
    acted = runCommand(ctx, command) || acted
  }
  // An invalid command on the player's turn must not let time slip forward.
  if (waitingForPlayer && !acted) return { state, events: ctx.events }

  tickInk(ctx.state.player)
  if (ctx.state.status === 'ongoing') tickEnemy(ctx)
  ctx.state.tick += 1
  return { state: ctx.state, events: ctx.events }
}

/** Returns true when the command was accepted. */
function runCommand(ctx: StepContext, command: PlayerCommand): boolean {
  const player = ctx.state.player
  const slot = command.type === 'cast' ? command.slot : undefined
  if (!isPlayerTurn(ctx.state)) {
    ctx.events.push({ type: 'commandRejected', slot, reason: 'notYourTurn' })
    return false
  }

  if (command.type === 'wait') {
    const ticks = durationTicks(WAIT_SECONDS)
    player.readyAt = ctx.state.tick + ticks
    ctx.events.push({ type: 'wait', ticks })
    return true
  }

  const card = player.hand[command.slot]
  if (!card) {
    ctx.events.push({ type: 'commandRejected', slot, reason: 'noSuchSlot' })
    return false
  }
  const spell = getSpell(ctx.content, card.spellId)
  if (player.ink < spell.cost) {
    ctx.events.push({ type: 'commandRejected', slot, reason: 'notEnoughInk' })
    return false
  }

  player.ink -= spell.cost
  player.readyAt = ctx.state.tick + durationTicks(spell.time)
  ctx.events.push({ type: 'spellCast', side: 'player', spellId: spell.id, slot })
  playFromHand(ctx, command.slot)
  applyEffects(ctx, 'player', spell.effects)
  return true
}

// --- Real-time driver -------------------------------------------------------

/** Caps catch-up after a long frame (tab switch, breakpoint) instead of fast-forwarding. */
export const MAX_STEPS_PER_FRAME = 10

/**
 * Converts real elapsed time into a whole number of fixed steps.
 * `speed` scales time: 1 normal, 2 fast, 0 paused.
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

/**
 * Decides the player's command when it is their turn. Must be deterministic.
 * Returning nothing on the player's turn counts as a wait.
 */
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
    let commands: PlayerCommand[] = []
    if (isPlayerTurn(state)) {
      commands = policy(state, content)
      if (commands.length === 0) commands = [{ type: 'wait' }]
    }
    let result = step(content, state, commands)
    // A policy that only issues rejected commands would freeze time forever.
    if (result.state === state) result = step(content, state, [{ type: 'wait' }])
    state = result.state
    if (recordLog) log.push(...result.events.map((event) => ({ tick, event })))
  }

  const outcome = state.status === 'ongoing' ? 'timeout' : state.status
  return { outcome, state, log }
}
