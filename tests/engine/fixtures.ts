// Small hand-made content for engine unit tests, independent from the tunable game data.

import {
  createDuel,
  type DuelContent,
  type DuelState,
  type EnemyDef,
  type PlayerSetup,
  type WordDef,
} from '../../src/engine/index.ts'

export const TEST_WORDS: Record<string, WordDef> = Object.fromEntries(
  (
    [
      { id: 'strike', name: 'Strike', kind: 'verb', effects: [{ kind: 'damage', amount: 4 }] },
      { id: 'ward', name: 'Ward', kind: 'verb', effects: [{ kind: 'shield', amount: 6 }] },
      { id: 'mend', name: 'Mend', kind: 'verb', effects: [{ kind: 'heal', amount: 5 }] },
      { id: 'twice', name: 'Twice', kind: 'modifier', modifier: { type: 'repeat', times: 2 } },
      {
        id: 'greater',
        name: 'Greater',
        kind: 'modifier',
        modifier: { type: 'amplify', amount: 3 },
      },
      {
        id: 'fire',
        name: 'Fire',
        kind: 'ink',
        element: 'fire',
        effects: [{ kind: 'applyStatus', status: 'burn', stacks: 2 }],
      },
      {
        id: 'ice',
        name: 'Ice',
        kind: 'ink',
        element: 'ice',
        effects: [{ kind: 'applyStatus', status: 'chill', stacks: 3 }],
      },
      {
        id: 'arcane',
        name: 'Arcane',
        kind: 'ink',
        element: 'arcane',
        effects: [{ kind: 'draw', count: 1 }],
      },
      { id: 'erase', name: 'Erase', kind: 'edit', edit: 'erase' },
      // Phase 3 mechanics
      {
        id: 'ignite',
        name: 'Ignite',
        kind: 'verb',
        effects: [{ kind: 'damage', amount: 2, scaling: { per: 'targetBurn', each: 2 } }],
      },
      {
        id: 'shatter',
        name: 'Shatter',
        kind: 'verb',
        effects: [
          { kind: 'damage', amount: 3, scaling: { per: 'targetChill', each: 3, consume: true } },
        ],
      },
      {
        id: 'riposte',
        name: 'Riposte',
        kind: 'verb',
        effects: [{ kind: 'damage', amount: 0, scaling: { per: 'ownWard', each: 1 } }],
      },
      {
        id: 'litany',
        name: 'Litany',
        kind: 'verb',
        effects: [{ kind: 'damage', amount: 0, scaling: { per: 'spellWords', each: 2 } }],
      },
      {
        id: 'call',
        name: 'Call',
        kind: 'verb',
        effects: [{ kind: 'summon', minion: { name: 'Inkling', attack: 2, turns: 2 } }],
      },
      { id: 'rally', name: 'Rally', kind: 'verb', effects: [{ kind: 'rally', bonus: 1 }] },
      { id: 'blot', name: 'Blot', kind: 'verb', effects: [{ kind: 'counter' }] },
      {
        id: 'focus',
        name: 'Focus',
        kind: 'verb',
        effects: [{ kind: 'applyStatus', status: 'focus', stacks: 4, target: 'self' }],
      },
      { id: 'echo', name: 'Echo', kind: 'modifier', modifier: { type: 'echo' } },
      { id: 'verbose', name: 'Verbose', kind: 'modifier', modifier: { type: 'expand', words: 2 } },
      {
        id: 'thorn',
        name: 'Thorn',
        kind: 'ink',
        element: 'thorn',
        effects: [{ kind: 'applyStatus', status: 'thorns', stacks: 3, target: 'self' }],
      },
      {
        id: 'verdant',
        name: 'Verdant',
        kind: 'ink',
        element: 'verdant',
        effects: [{ kind: 'applyStatus', status: 'regen', stacks: 3, target: 'self' }],
      },
    ] satisfies WordDef[]
  ).map((word) => [word.id, word]),
)

/** Casts a plain Strike (4 damage) every turn. */
export const TEST_ENEMY: EnemyDef = {
  id: 'dummy',
  name: 'Dummy',
  maxHp: 30,
  behaviour: 'rotation',
  spells: [{ words: ['strike'] }],
}

export const TEST_PLAYER: PlayerSetup = {
  maxHp: 30,
  handSize: 4,
  maxWords: 3,
  deck: ['strike', 'strike', 'ward', 'mend', 'twice', 'greater', 'fire', 'ice'],
}

export function makeContent(
  overrides: { player?: Partial<PlayerSetup>; enemy?: Partial<EnemyDef> } = {},
): DuelContent {
  return {
    words: TEST_WORDS,
    player: { ...TEST_PLAYER, ...overrides.player },
    enemy: { ...TEST_ENEMY, ...overrides.enemy },
  }
}

/** A fresh duel whose hand is exactly `hand` (draw pile keeps the shuffled deck). */
export function duelWithHand(content: DuelContent, hand: string[], seed = 1): DuelState {
  const state = createDuel(content, seed)
  state.player.hand = hand.map((wordId, i) => ({ uid: 100 + i, wordId }))
  return state
}
