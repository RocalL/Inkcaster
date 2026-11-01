import { describe, expect, it } from 'vitest'
import { chooseEnemySpell, seedRng, type EnemyDef } from '../../src/engine/index.ts'
import { makeCombat, makeContent, run } from './fixtures.ts'

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

    const before = run(content, start, 19)
    expect(before.state.enemy.cast).toBeNull()

    const started = run(content, start, 20)
    expect(started.state.enemy.cast).toEqual({ spellIndex: 0, totalTicks: 10, remainingTicks: 10 })
    expect(started.events).toContainEqual({ type: 'enemyCastStart', spellId: 'jab', castTicks: 10 })

    expect(run(content, start, 29).state.player.hp).toBe(30)
    const resolved = run(content, start, 30)
    expect(resolved.state.player.hp).toBe(27)
    expect(resolved.state.enemy.cast).toBeNull()
    expect(resolved.events).toContainEqual({ type: 'spellCast', side: 'enemy', spellId: 'jab' })
  })

  it('rotation casts spells in order and loops', () => {
    const content = makeContent({ enemy: rotationEnemy })
    const { events } = run(content, makeCombat(content), 20 + 3 * 30)
    const started = events.flatMap((event) =>
      event.type === 'enemyCastStart' ? [event.spellId] : [],
    )
    expect(started).toEqual(['jab', 'guard', 'jab', 'guard'])
  })

  it("enemy spells target the player as 'enemy' and itself as 'self'", () => {
    const content = makeContent({ enemy: rotationEnemy })
    const { state } = run(content, makeCombat(content), 60)
    expect(state.player.hp).toBe(27)
    expect(state.enemy.shield).toBe(5)
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
