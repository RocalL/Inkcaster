// A greedy player used by the headless sim. On each turn it tries every legal sentence
// (and a few erase targets) with the real engine and keeps the best resulting position.
// It looks one round ahead only: good enough to balance against, not a strong player.

import { act, type PlayerCommand, type PlayerPolicy } from './duel.ts'
import { getWord, type DuelState } from './state.ts'
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
  const { player, enemy } = state
  return (
    player.hp * 1.0 -
    enemy.hp * 1.2 +
    player.ward * 0.4 -
    enemy.ward * 0.4 +
    enemy.statuses.burn * 1.5 -
    player.statuses.burn * 1.5 +
    enemy.statuses.chill * 0.6
  )
}

function candidateCommands(state: DuelState, content: DuelContent): PlayerCommand[] {
  const hand = state.player.hand
  const kindOf = (index: number) => getWord(content, hand[index]?.wordId ?? '').kind
  const verbs = hand.flatMap((_, index) => (kindOf(index) === 'verb' ? [index] : []))
  const others = hand.flatMap((_, index) => (kindOf(index) === 'verb' ? [] : [index]))
  const eraseTargets = state.enemy.intent.flatMap((word, index) =>
    !word.erased && getWord(content, word.wordId).kind !== 'verb' ? [index] : [],
  )

  const commands: PlayerCommand[] = [
    { type: 'discard', words: [] },
    { type: 'discard', words: others },
  ]
  const extraSets = subsets(others, content.player.maxWords - 1)
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
