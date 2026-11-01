import { describe, expect, it } from 'vitest'
import type { CombatContent, Effect } from '../../src/engine/index.ts'
import { TEST_SPELLS, cast, makeCombat, makeContent, run } from './fixtures.ts'

/** Content whose whole grimoire is one test spell with the given effects. */
function contentWith(effects: Effect[], grimoire = ['probe', 'probe', 'probe', 'probe']) {
  const base = makeContent({ player: { grimoire } })
  const content: CombatContent = {
    ...base,
    spells: {
      ...TEST_SPELLS,
      probe: {
        id: 'probe',
        name: 'Probe',
        type: 'direct',
        cost: 0,
        cooldown: 1,
        tags: [],
        effects,
      },
    },
  }
  return content
}

function castProbe(effects: Effect[]) {
  const content = contentWith(effects)
  return run(content, makeCombat(content), 1, [cast(0)])
}

describe('damage', () => {
  it('hits the enemy by default', () => {
    const { state, events } = castProbe([{ kind: 'damage', amount: 6 }])
    expect(state.enemy.hp).toBe(14)
    expect(events).toContainEqual({ type: 'damage', target: 'enemy', amount: 6, absorbed: 0 })
  })

  it('can target self', () => {
    const { state } = castProbe([{ kind: 'damage', amount: 4, target: 'self' }])
    expect(state.player.hp).toBe(26)
  })

  it('is absorbed by shield first', () => {
    const { state, events } = castProbe([
      { kind: 'shield', amount: 4, target: 'enemy' },
      { kind: 'damage', amount: 6 },
    ])
    expect(state.enemy).toMatchObject({ hp: 18, shield: 0 })
    expect(events).toContainEqual({ type: 'damage', target: 'enemy', amount: 2, absorbed: 4 })
  })

  it('kills at 0 hp, ends the combat and stops later effects', () => {
    const { state, events } = castProbe([
      { kind: 'damage', amount: 50 },
      { kind: 'heal', amount: 5, target: 'enemy' },
    ])
    expect(state.enemy.hp).toBe(0)
    expect(state.status).toBe('won')
    expect(events).toContainEqual({ type: 'damage', target: 'enemy', amount: 20, absorbed: 0 })
    expect(events).toContainEqual({ type: 'death', side: 'enemy' })
    expect(events.some((event) => event.type === 'heal')).toBe(false)
  })

  it('killing yourself loses the combat', () => {
    const { state } = castProbe([{ kind: 'damage', amount: 99, target: 'self' }])
    expect(state.status).toBe('lost')
  })
})

describe('heal', () => {
  it('heals self by default, capped at max hp', () => {
    const { state, events } = castProbe([
      { kind: 'damage', amount: 3, target: 'self' },
      { kind: 'heal', amount: 10 },
    ])
    expect(state.player.hp).toBe(30)
    expect(events).toContainEqual({ type: 'heal', target: 'player', amount: 3 })
  })
})

describe('shield', () => {
  it('shields self by default and stacks', () => {
    const { state } = castProbe([
      { kind: 'shield', amount: 4 },
      { kind: 'shield', amount: 3 },
    ])
    expect(state.player.shield).toBe(7)
  })
})

describe('draw', () => {
  it('refills recharging slots immediately, closest to ready first', () => {
    const content = contentWith([{ kind: 'draw', count: 1 }])
    const state = makeCombat(content)
    state.player.hand = [
      { card: { uid: 0, spellId: 'probe' }, cooldown: 0 },
      { card: null, cooldown: 15 },
      { card: null, cooldown: 5 },
    ]
    state.player.drawPile = [
      { uid: 1, spellId: 'bolt' },
      { uid: 2, spellId: 'bolt' },
    ]

    const { state: after, events } = run(content, state, 1, [cast(0)])
    expect(after.player.hand.map((slot) => slot.card?.uid ?? null)).toEqual([null, null, 1])
    expect(events.filter((event) => event.type === 'cardDrawn')).toEqual([
      { type: 'cardDrawn', slot: 2, spellId: 'bolt' },
    ])
  })

  it('draws as many pages as asked, up to the empty slots', () => {
    const content = contentWith([{ kind: 'draw', count: 5 }])
    const state = makeCombat(content)
    state.player.hand = [
      { card: { uid: 0, spellId: 'probe' }, cooldown: 0 },
      { card: null, cooldown: 15 },
    ]
    state.player.drawPile = [
      { uid: 1, spellId: 'bolt' },
      { uid: 2, spellId: 'bolt' },
      { uid: 3, spellId: 'bolt' },
    ]

    const { state: after } = run(content, state, 1, [cast(0)])
    expect(after.player.hand.map((slot) => slot.card?.uid)).toEqual([2, 1])
    expect(after.player.drawPile.map((card) => card.uid)).toEqual([3])
  })

  it('does nothing for the enemy', () => {
    const content = makeContent({
      enemy: {
        openingDelay: 0,
        spells: [
          { id: 'think', name: 'Think', castTime: 0.05, effects: [{ kind: 'draw', count: 2 }] },
        ],
      },
    })
    const start = makeCombat(content)
    const { state } = run(content, start, 2)
    expect(state.player.hand).toEqual(start.player.hand)
  })
})
