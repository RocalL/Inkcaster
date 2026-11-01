// Small hand-made content for engine unit tests, independent from the tunable game data.

import {
  createCombat,
  step,
  type CombatContent,
  type CombatEvent,
  type CombatState,
  type EnemyDef,
  type PlayerCommand,
  type PlayerSetup,
  type SpellDef,
} from '../../src/engine/index.ts'

export const TEST_SPELLS: Record<string, SpellDef> = {
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    type: 'direct',
    cost: 1,
    cooldown: 1,
    tags: [],
    effects: [{ kind: 'damage', amount: 5 }],
  },
  ward: {
    id: 'ward',
    name: 'Ward',
    type: 'ward',
    cost: 1,
    cooldown: 1,
    tags: [],
    effects: [{ kind: 'shield', amount: 4 }],
  },
  salve: {
    id: 'salve',
    name: 'Salve',
    type: 'utility',
    cost: 1,
    cooldown: 1,
    tags: [],
    effects: [{ kind: 'heal', amount: 5 }],
  },
  study: {
    id: 'study',
    name: 'Study',
    type: 'utility',
    cost: 1,
    cooldown: 1,
    tags: [],
    effects: [{ kind: 'draw', count: 1 }],
  },
  costly: {
    id: 'costly',
    name: 'Costly',
    type: 'direct',
    cost: 5,
    cooldown: 1,
    tags: [],
    effects: [{ kind: 'damage', amount: 1 }],
  },
}

/** Enemy that never acts within a normal test (first cast after 1000s). */
export const PASSIVE_ENEMY: EnemyDef = {
  id: 'dummy',
  name: 'Dummy',
  maxHp: 20,
  behaviour: 'rotation',
  castGap: 1,
  openingDelay: 1000,
  spells: [{ id: 'poke', name: 'Poke', castTime: 0.5, effects: [{ kind: 'damage', amount: 3 }] }],
}

export const TEST_PLAYER: PlayerSetup = {
  maxHp: 30,
  maxInk: 5,
  startingInk: 5,
  inkPerSecond: 1,
  handSize: 2,
  grimoire: ['bolt', 'bolt', 'bolt', 'bolt'],
}

export function makeContent(
  overrides: { player?: Partial<PlayerSetup>; enemy?: Partial<EnemyDef> } = {},
): CombatContent {
  return {
    spells: TEST_SPELLS,
    player: { ...TEST_PLAYER, ...overrides.player },
    enemy: { ...PASSIVE_ENEMY, ...overrides.enemy },
  }
}

export function makeCombat(content: CombatContent = makeContent(), seed = 1): CombatState {
  return createCombat(content, seed)
}

/** Steps `count` times; commands are only sent on the first step. Returns every event emitted. */
export function run(
  content: CombatContent,
  state: CombatState,
  count: number,
  commands: PlayerCommand[] = [],
): { state: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = []
  let current = state
  for (let i = 0; i < count; i++) {
    const result = step(content, current, i === 0 ? commands : [])
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

export function cast(slot: number): PlayerCommand {
  return { type: 'cast', slot }
}
