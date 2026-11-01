import { describe, expect, it } from 'vitest'
import { greedyBot, runDuel, step, type CombatState } from '../../src/engine/index.ts'
import { cast, makeCombat, makeContent, run } from './fixtures.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const fightingEnemy = {
  openingDelay: 0.5,
  castGap: 0.5,
  spells: [
    { id: 'jab', name: 'Jab', castTime: 0.5, effects: [{ kind: 'damage' as const, amount: 2 }] },
    {
      id: 'guard',
      name: 'Guard',
      castTime: 0.5,
      effects: [{ kind: 'shield' as const, amount: 3 }],
    },
  ],
}

describe('step', () => {
  it('never mutates its input state', () => {
    const content = makeContent({
      enemy: { ...fightingEnemy, maxHp: 1000 },
      player: { grimoire: ['bolt', 'ward', 'study', 'bolt'] },
    })
    let state: CombatState = deepFreeze(makeCombat(content))
    for (let tick = 0; tick < 200; tick++) {
      state = deepFreeze(step(content, state, tick % 7 === 0 ? [cast(tick % 2)] : []).state)
    }
    expect(state.tick).toBe(200)
  })

  it('advances the tick counter', () => {
    const content = makeContent()
    expect(run(content, makeCombat(content), 3).state.tick).toBe(3)
  })

  it('is a no-op once the combat is over', () => {
    const content = makeContent()
    const ended: CombatState = { ...makeCombat(content), status: 'won' }
    const result = step(content, ended, [cast(0)])
    expect(result.state).toBe(ended)
    expect(result.events).toEqual([])
  })

  it('same seed and same inputs give the same result', () => {
    const content = makeContent({
      enemy: { ...fightingEnemy, behaviour: 'weighted' },
      player: { grimoire: ['bolt', 'ward', 'study', 'salve', 'bolt', 'ward'] },
    })
    const a = runDuel(content, 77, greedyBot, { recordLog: true })
    const b = runDuel(content, 77, greedyBot, { recordLog: true })
    expect(a).toEqual(b)
  })
})

describe('runDuel', () => {
  it('plays a full duel to a result', () => {
    const content = makeContent({
      enemy: { ...fightingEnemy, spells: fightingEnemy.spells.slice(0, 1) },
      player: { grimoire: ['bolt', 'ward', 'salve', 'study'] },
    })
    const result = runDuel(content, 1, greedyBot, { recordLog: true })
    expect(result.outcome).toBe('won')
    expect(result.state.enemy.hp).toBe(0)
    expect(result.log.at(-1)?.event).toEqual({ type: 'death', side: 'enemy' })
  })

  it('reports a timeout when nobody wins', () => {
    const content = makeContent()
    const result = runDuel(content, 1, () => [], { maxTicks: 50 })
    expect(result.outcome).toBe('timeout')
    expect(result.state.tick).toBe(50)
  })
})
