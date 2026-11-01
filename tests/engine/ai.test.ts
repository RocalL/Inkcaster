import { describe, expect, it } from 'vitest'
import {
  chooseEnemySpell,
  forecastEnemy,
  seedRng,
  type CombatEvent,
  type EnemyDef,
} from '../../src/engine/index.ts'
import { advance, makeCombat, makeContent } from './fixtures.ts'

const rotationEnemy: Partial<EnemyDef> = {
  behaviour: 'rotation',
  openingDelay: 1,
  castGap: 1,
  spells: [
    { id: 'jab', name: 'Jab', castTime: 0.5, effects: [{ kind: 'damage', amount: 3 }] },
    { id: 'guard', name: 'Guard', castTime: 0.5, effects: [{ kind: 'shield', amount: 5 }] },
  ],
}

describe('enemy casting', () => {
  it('telegraphs a cast bar after the opening delay, then resolves it', () => {
    const content = makeContent({ enemy: rotationEnemy })
    const start = makeCombat(content)

    const before = advance(content, start, 19)
    expect(before.state.enemy.cast).toBeNull()

    const started = advance(content, start, 20)
    expect(started.state.enemy.cast).toEqual({ spellIndex: 0, totalTicks: 10, remainingTicks: 10 })
    expect(started.events).toContainEqual({ type: 'enemyCastStart', spellId: 'jab', castTicks: 10 })

    expect(advance(content, start, 29).state.player.hp).toBe(30)
    const resolved = advance(content, start, 30)
    expect(resolved.state.player.hp).toBe(27)
    expect(resolved.state.enemy.cast).toBeNull()
    expect(resolved.events).toContainEqual({ type: 'spellCast', side: 'enemy', spellId: 'jab' })
  })

  it('rotation casts spells in order and loops', () => {
    const content = makeContent({ enemy: rotationEnemy })
    const { events } = advance(content, makeCombat(content), 20 + 3 * 30)
    const started = events.flatMap((event) =>
      event.type === 'enemyCastStart' ? [event.spellId] : [],
    )
    expect(started).toEqual(['jab', 'guard', 'jab', 'guard'])
  })

  it("enemy spells target the player as 'enemy' and itself as 'self'", () => {
    const content = makeContent({ enemy: rotationEnemy })
    const { state } = advance(content, makeCombat(content), 60)
    expect(state.player.hp).toBe(27)
    expect(state.enemy.shield).toBe(5)
  })
})

describe('forecastEnemy', () => {
  it('predicts a rotation rival: start and landing of the next casts', () => {
    const content = makeContent({ enemy: rotationEnemy })
    expect(forecastEnemy(content, makeCombat(content))).toEqual([
      { spellId: 'jab', startsAt: 20, landsAt: 30 },
      { spellId: 'guard', startsAt: 50, landsAt: 60 },
      { spellId: 'jab', startsAt: 80, landsAt: 90 },
    ])
  })

  it('includes the cast in progress', () => {
    const content = makeContent({ enemy: rotationEnemy })
    const { state } = advance(content, makeCombat(content), 25)
    expect(forecastEnemy(content, state, 1)).toEqual([
      { spellId: 'jab', startsAt: 20, landsAt: 30 },
    ])
  })

  it('matches what actually happens: each spell resolves just before landsAt', () => {
    const content = makeContent({ enemy: { ...rotationEnemy, castGap: 0.35 } })
    let state = makeCombat(content)
    for (let i = 0; i < 6; i++) {
      const [next] = forecastEnemy(content, state, 1)
      if (!next?.landsAt) throw new Error('rotation forecasts are always known')
      const before = advance(content, state, next.landsAt - 1 - state.tick)
      const landing = advance(content, before.state, 1)
      const resolved = (events: CombatEvent[]) =>
        events.some((event) => event.type === 'spellCast' && event.side === 'enemy')
      expect(resolved(before.events)).toBe(false)
      expect(resolved(landing.events)).toBe(true)
      expect(landing.state.tick).toBe(next.landsAt)
      state = landing.state
    }
  })

  it('a weighted rival only reveals its spell once the cast bar starts', () => {
    const content = makeContent({ enemy: { ...rotationEnemy, behaviour: 'weighted' } })
    const start = makeCombat(content)
    expect(forecastEnemy(content, start)).toEqual([{ spellId: null, startsAt: 20, landsAt: null }])

    const { state } = advance(content, start, 21)
    const [current, next] = forecastEnemy(content, state)
    expect(current?.spellId).not.toBeNull()
    expect(current?.landsAt).toBe(30)
    expect(next).toEqual({ spellId: null, startsAt: 50, landsAt: null })
  })
})

describe('chooseEnemySpell (weighted)', () => {
  const weighted: EnemyDef = {
    id: 'w',
    name: 'W',
    maxHp: 10,
    behaviour: 'weighted',
    castGap: 1,
    spells: [
      { id: 'common', name: 'Common', castTime: 1, weight: 3, effects: [] },
      { id: 'rare', name: 'Rare', castTime: 1, weight: 1, effects: [] },
      { id: 'never', name: 'Never', castTime: 1, weight: 0, effects: [] },
    ],
  }
  const enemyState = makeCombat().enemy

  it('is deterministic for a given rng state', () => {
    expect(chooseEnemySpell(weighted, enemyState, seedRng(4))).toEqual(
      chooseEnemySpell(weighted, enemyState, seedRng(4)),
    )
  })

  it('follows the weights', () => {
    const counts = [0, 0, 0]
    let rng = seedRng(11)
    for (let i = 0; i < 4000; i++) {
      const [index, next] = chooseEnemySpell(weighted, enemyState, rng)
      counts[index] = (counts[index] ?? 0) + 1
      rng = next
    }
    expect(counts[2]).toBe(0)
    expect((counts[0] ?? 0) / 4000).toBeCloseTo(0.75, 1)
  })
})
