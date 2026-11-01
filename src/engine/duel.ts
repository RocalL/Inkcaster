// Duel flow. One player action resolves the player's spell, then the rival's whole turn,
// then the start of the player's next turn. Pure: the input state is never mutated.

import { chooseIntent } from './ai.ts'
import { applyEffects, startTurn } from './effects.ts'
import type { CombatEvent, RejectReason } from './events.ts'
import { discardFromHand, refillHand } from './hand.ts'
import { applyChill, composeSpell, type ComposeResult } from './spell.ts'
import {
  cloneState,
  createInitialState,
  getWord,
  type ActionContext,
  type DuelState,
} from './state.ts'
import type { DuelContent } from './types.ts'

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
  refillHand(ctx, content.player.handSize)

  // Rival turn.
  if (ctx.state.status === 'ongoing') startTurn(ctx, 'enemy')
  if (ctx.state.status === 'ongoing') {
    castSpell(ctx, 'enemy', castableIntent(ctx.state))
    enemy.spellsCast += 1
    if (ctx.state.status === 'ongoing') chooseIntent(ctx)
  }

  // Start of the player's next turn.
  if (ctx.state.status === 'ongoing') {
    startTurn(ctx, 'player')
    ctx.state.round += 1
  }
  return { state: ctx.state, events: ctx.events }
}

/** What the rival's next spell will do right now, after erasures and chill. */
export function previewIntent(content: DuelContent, state: DuelState): ComposeResult {
  const result = composeSpell(content, castableIntent(state))
  if (!result.ok) return result
  const chill = state.enemy.statuses.chill
  return {
    ...result,
    once: applyChill(result.once, chill),
    effects: applyChill(result.effects, chill),
  }
}

/** What writing these hand words would do, including the caster's chill. */
export function previewSpell(
  content: DuelContent,
  state: DuelState,
  handIndices: readonly number[],
): ComposeResult {
  const wordIds = handIndices.map((index) => state.player.hand[index]?.wordId ?? '')
  if (wordIds.includes('')) return { ok: false, reason: 'needOneVerb' }
  const result = composeSpell(content, wordIds)
  if (!result.ok) return result
  const chill = state.player.statuses.chill
  return {
    ...result,
    once: applyChill(result.once, chill),
    effects: applyChill(result.effects, chill),
  }
}

function castableIntent(state: DuelState): string[] {
  return state.enemy.intent.filter((word) => !word.erased).map((word) => word.wordId)
}

function castSpell(ctx: ActionContext, caster: 'player' | 'enemy', wordIds: string[]): void {
  const spell = composeSpell(ctx.content, wordIds)
  ctx.events.push({ type: 'spellWritten', side: caster, words: wordIds })
  if (!spell.ok) return
  const fighter = caster === 'player' ? ctx.state.player : ctx.state.enemy
  const effects = applyChill(spell.effects, fighter.statuses.chill)
  fighter.statuses.chill = 0
  applyEffects(ctx, caster, effects)
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

  if (indices.length > content.player.maxWords) return 'tooManyWords'
  const words = indices.map((index) => getWord(content, hand[index]?.wordId ?? ''))
  if (words.filter((word) => word.kind === 'verb').length !== 1) return 'needOneVerb'

  const erase = command.erase ?? []
  if (erase.length !== words.filter((word) => word.kind === 'edit').length) {
    return 'eraseTargetCount'
  }
  for (const target of erase) {
    const word = state.enemy.intent[target]
    if (!word || word.erased || getWord(content, word.wordId).kind === 'verb') {
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
