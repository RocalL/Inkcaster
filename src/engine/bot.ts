// A greedy player used by the headless sim. On each turn it tries every legal sentence
// (and a few erase targets) with the real engine and keeps the best resulting position.
// It looks one round ahead only: good enough to balance against, not a strong player.

import { act, type PlayerCommand, type PlayerPolicy } from './duel.ts'
import { getWord, type DuelState, type Fighter } from './state.ts'
import type { DuelContent } from './types.ts'

export const greedyBot: PlayerPolicy = (state, content) => {
  let best: { command: PlayerCommand; score: number } | null = null
  for (const command of candidateCommands(state, content)) {
    const result = act(content, state, command)
    if (result.state === state) continue
    const score = evaluate(result.state)
    if (!best || score > best.score) best = { command, score }
  }
  return best?.command ?? { type: 'discard', words: [] }
}

function evaluate(state: DuelState): number {
  if (state.status === 'won') return 10_000
  if (state.status === 'lost') return -10_000
  return (
    strength(state.player) * 1.0 - strength(state.enemy) * 1.2 + state.enemy.statuses.chill * 0.6
  )
}

/** Rough value of a fighter's position: hp plus everything that will turn into hp or damage. */
function strength(fighter: Fighter): number {
  const { statuses } = fighter
  const minionDamage = fighter.minions.reduce(
    (sum, minion) => sum + minion.attack * minion.turnsLeft,
    0,
  )
  return (
    fighter.hp +
    fighter.ward * 0.4 -
    statuses.burn * 1.5 +
    statuses.regen * 1.2 +
    statuses.focus * 0.8 +
    statuses.thorns * 0.8 -
    statuses.brand * 1 -
    statuses.stain * 1.5 +
    statuses.inspire * 1.5 +
    minionDamage * 0.7 +
    (fighter.echo ? 4 : 0)
  )
}

function candidateCommands(state: DuelState, content: DuelContent): PlayerCommand[] {
  const hand = state.player.hand
  const kindOf = (index: number) => getWord(content, hand[index]?.wordId ?? '').kind
  const verbs = hand.flatMap((_, index) => (kindOf(index) === 'verb' ? [index] : []))
  const others = hand.flatMap((_, index) => (kindOf(index) === 'verb' ? [] : [index]))
  // Every word still standing; Erase on a verb is rejected by the engine, Redact allows it.
  const eraseTargets = state.enemy.intent.flatMap((word, index) => (word.erased ? [] : [index]))

  const commands: PlayerCommand[] = [
    { type: 'discard', words: [] },
    { type: 'discard', words: others },
  ]
  // One more than the normal limit, for sentences with Verbose; invalid ones are rejected.
  const extraSets = subsets(others, content.player.maxWords)
  for (const verb of verbs) {
    for (const extras of extraSets) {
      const words = [verb, ...extras]
      const edits = extras.filter((index) => kindOf(index) === 'edit').length
      for (const erase of subsets(eraseTargets, edits).filter((set) => set.length === edits)) {
        commands.push({ type: 'write', words, erase })
      }
    }
  }
  return commands
}

/** All subsets of `items` with at most `max` elements, including the empty one. */
function subsets(items: readonly number[], max: number): number[][] {
  const result: number[][] = [[]]
  for (const item of items) {
    for (const set of [...result]) {
      if (set.length < max) result.push([...set, item])
    }
  }
  return result
}
