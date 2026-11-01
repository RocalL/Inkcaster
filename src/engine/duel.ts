// Duel flow. One player action resolves the player's spell, then the rival's whole turn,
// then the start of the player's next turn. Pure: the input state is never mutated.

import { chooseIntent } from './ai.ts'
import { applyEffects, endTurnMinions, stainOnCast, startTurnStatuses } from './effects.ts'
import type { CombatEvent, RejectReason } from './events.ts'
import { discardFromHand, refillHand } from './hand.ts'
import { applyChill, composeSpell, type ComposeResult } from './spell.ts'
import {
  cloneState,
  createInitialState,
  getFighter,
  getWord,
  type ActionContext,
  type DuelState,
} from './state.ts'
import type { DuelContent, Effect, Side } from './types.ts'

export type PlayerCommand =
  /**
   * Write a spell from hand indices. `erase` lists rival intent indices, one per edit word,
   * in the order the edit words appear.
   */
  | { type: 'write'; words: number[]; erase?: number[] }
  /** Discard any words (possibly none) and end the turn without casting. */
  | { type: 'discard'; words: number[] }

export interface ActionResult {
  state: DuelState
  events: CombatEvent[]
}

export function createDuel(content: DuelContent, seed: number): DuelState {
  const state = createInitialState(content, seed)
  chooseIntent({ content, state, events: [] })
  return state
}

export function act(content: DuelContent, state: DuelState, command: PlayerCommand): ActionResult {
  if (state.status !== 'ongoing') return { state, events: [] }
  const rejection = validate(content, state, command)
  if (rejection) return { state, events: [{ type: 'commandRejected', reason: rejection }] }

  const ctx: ActionContext = { content, state: cloneState(state), events: [] }
  const { player, enemy } = ctx.state

  if (command.type === 'write') {
    const wordIds = command.words.map((index) => player.hand[index]?.wordId ?? '')
    discardFromHand(ctx, command.words)
    for (const target of command.erase ?? []) {
      const word = enemy.intent[target]
      if (!word) continue
      word.erased = true
      ctx.events.push({ type: 'wordErased', wordId: word.wordId })
    }
    castSpell(ctx, 'player', wordIds)
  } else {
    discardFromHand(ctx, command.words)
    ctx.events.push({ type: 'wordsDiscarded', count: command.words.length })
  }
  if (ongoing(ctx)) endTurnMinions(ctx, 'player')
  refillHand(ctx, content.player.handSize)

  // Rival turn.
  if (ongoing(ctx)) startTurn(ctx, 'enemy')
  if (ongoing(ctx)) {
    if (enemy.countered) {
      enemy.countered = false
      ctx.events.push({ type: 'spellCountered', side: 'enemy' })
    } else {
      castSpell(ctx, 'enemy', castableIntent(ctx.state))
    }
    enemy.spellsCast += 1
  }
  if (ongoing(ctx)) endTurnMinions(ctx, 'enemy')
  if (ongoing(ctx)) chooseIntent(ctx)

  // Start of the player's next turn.
  if (ongoing(ctx)) startTurn(ctx, 'player')
  if (ongoing(ctx)) ctx.state.round += 1
  return { state: ctx.state, events: ctx.events }
}

/**
 * What the rival's next spell will do right now, after erasures, chill and its focus.
 * Scaling damage is resolved against the current state.
 */
export function previewIntent(content: DuelContent, state: DuelState): ComposeResult {
  return preview(content, state, 'enemy', castableIntent(state))
}

/** What writing these hand words would do now, including the caster's chill and focus. */
export function previewSpell(
  content: DuelContent,
  state: DuelState,
  handIndices: readonly number[],
): ComposeResult {
  const wordIds = handIndices.map((index) => state.player.hand[index]?.wordId ?? '')
  if (wordIds.includes('')) return { ok: false, reason: 'needOneVerb' }
  return preview(content, state, 'player', wordIds)
}

function preview(
  content: DuelContent,
  state: DuelState,
  caster: Side,
  wordIds: string[],
): ComposeResult {
  const fighter = getFighter(state, caster)
  const result = composeSpell(content, wordIds, { bonusAmplify: fighter.statuses.focus })
  if (!result.ok) return result
  const chill = fighter.statuses.chill
  const once = resolveScaling(state, caster, applyChill(result.once, chill), result.wordCount)
  const effects = resolveScaling(state, caster, applyChill(result.effects, chill), result.wordCount)
  return { ...result, once, effects }
}

/** Turns scaling damage into plain numbers for display; consumed statuses count once. */
function resolveScaling(
  state: DuelState,
  caster: Side,
  effects: Effect[],
  wordCount: number,
): Effect[] {
  const target = caster === 'player' ? state.enemy : state.player
  const used = new Set<string>()
  return effects.map((effect) => {
    if (effect.kind !== 'damage' || !effect.scaling) return effect
    const { per, each, consume } = effect.scaling
    let count = 0
    if (!used.has(per)) {
      if (per === 'targetBurn') count = target.statuses.burn
      else if (per === 'targetChill') count = target.statuses.chill
      else if (per === 'ownWard') count = getFighter(state, caster).ward
      else count = wordCount
    }
    if (consume) used.add(per)
    return { kind: 'damage', amount: effect.amount + count * each, target: effect.target }
  })
}

function ongoing(ctx: ActionContext): boolean {
  return ctx.state.status === 'ongoing'
}

function castableIntent(state: DuelState): string[] {
  return state.enemy.intent.filter((word) => !word.erased).map((word) => word.wordId)
}

/** Start of a turn: statuses tick, then a pending Echo is recast. */
function startTurn(ctx: ActionContext, side: Side): void {
  startTurnStatuses(ctx, side)
  const fighter = getFighter(ctx.state, side)
  if (!ongoing(ctx) || !fighter.echo) return
  const words = fighter.echo
  fighter.echo = null
  castSpell(ctx, side, words, { isEcho: true })
}

function castSpell(
  ctx: ActionContext,
  caster: Side,
  wordIds: string[],
  { isEcho = false }: { isEcho?: boolean } = {},
): void {
  const fighter = getFighter(ctx.state, caster)
  const spell = composeSpell(ctx.content, wordIds, { bonusAmplify: fighter.statuses.focus })
  ctx.events.push(
    isEcho
      ? { type: 'echo', side: caster, words: wordIds }
      : { type: 'spellWritten', side: caster, words: wordIds },
  )
  if (!spell.ok) return
  if (!stainOnCast(ctx, caster)) return
  const effects = applyChill(spell.effects, fighter.statuses.chill)
  fighter.statuses.chill = 0
  fighter.statuses.focus = 0
  if (spell.echo && !isEcho) fighter.echo = wordIds
  applyEffects(ctx, caster, effects, { wordCount: spell.wordCount, lifesteal: spell.lifesteal })
}

function validate(
  content: DuelContent,
  state: DuelState,
  command: PlayerCommand,
): RejectReason | null {
  const hand = state.player.hand
  const indices = command.words
  const validIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < hand.length
  if (!indices.every(validIndex) || new Set(indices).size !== indices.length) return 'badWordIndex'
  if (command.type === 'discard') return null

  const words = indices.map((index) => getWord(content, hand[index]?.wordId ?? ''))
  const extraWords = words.reduce(
    (sum, word) =>
      word.kind === 'modifier' && word.modifier.type === 'expand' ? sum + word.modifier.words : sum,
    0,
  )
  if (indices.length > content.player.maxWords + extraWords) return 'tooManyWords'
  if (words.filter((word) => word.kind === 'verb').length !== 1) return 'needOneVerb'

  const erase = command.erase ?? []
  if (erase.length !== words.filter((word) => word.kind === 'edit').length) {
    return 'eraseTargetCount'
  }
  const edits = words.flatMap((word) => (word.kind === 'edit' ? [word.edit] : []))
  for (const [i, target] of erase.entries()) {
    const word = state.enemy.intent[target]
    // Erase cannot touch the verb; Redact can.
    const verbAllowed = edits[i] === 'redact'
    if (!word || word.erased || (!verbAllowed && getWord(content, word.wordId).kind === 'verb')) {
      return 'badEraseTarget'
    }
  }
  if (new Set(erase).size !== erase.length) return 'badEraseTarget'
  return null
}

// --- Headless harness -------------------------------------------------------

/** Decides the player's command for the current state. Must be deterministic. */
export type PlayerPolicy = (state: DuelState, content: DuelContent) => PlayerCommand

export interface RoundLog {
  round: number
  command: PlayerCommand
  events: CombatEvent[]
}

export interface DuelResult {
  outcome: 'won' | 'lost' | 'timeout'
  state: DuelState
  /** Only filled when `recordLog` is set. */
  log: RoundLog[]
}

export interface RunDuelOptions {
  maxRounds?: number
  recordLog?: boolean
}

/** Runs a whole duel without rendering. Used by tests, the bot sim and the debug log. */
export function runDuel(
  content: DuelContent,
  seed: number,
  policy: PlayerPolicy,
  { maxRounds = 100, recordLog = false }: RunDuelOptions = {},
): DuelResult {
  let state = createDuel(content, seed)
  const log: RoundLog[] = []

  while (state.status === 'ongoing' && state.round <= maxRounds) {
    let command = policy(state, content)
    let result = act(content, state, command)
    // A rejected command would loop forever: pass instead.
    if (result.state === state) {
      command = { type: 'discard', words: [] }
      result = act(content, state, command)
    }
    if (recordLog) log.push({ round: state.round, command, events: result.events })
    state = result.state
  }

  const outcome = state.status === 'ongoing' ? 'timeout' : state.status
  return { outcome, state, log }
}
