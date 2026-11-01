// Phase 6 mechanics: brand, stain, inspire, pierce, cleanse, intensify, lifesteal, redact,
// rival starting ward, starting statuses.

import { describe, expect, it } from 'vitest'
import { act, composeSpell, createDuel, type CombatEvent } from '../../src/engine/index.ts'
import { duelWithHand, makeContent } from './fixtures.ts'

const quiet = { spells: [{ words: ['ward'] }] }
const write = (words: number[], erase?: number[]) => ({ type: 'write' as const, words, erase })
const pass = { type: 'discard' as const, words: [] }

function damageTo(events: CombatEvent[], target: 'player' | 'enemy') {
  return events.flatMap((event) =>
    event.type === 'damage' && event.target === target ? [event] : [],
  )
}

describe('brand', () => {
  it('makes the next hit taken deal +N, then clears', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['mend'] }] } })
    const first = act(content, duelWithHand(content, ['brand', 'strike', 'strike']), write([0]))
    expect(first.state.enemy.statuses.brand).toBe(4)
    const second = act(
      content,
      first.state,
      write([first.state.player.hand.findIndex((c) => c.wordId === 'strike')]),
    )
    expect(damageTo(second.events, 'enemy')[0]).toMatchObject({ amount: 8 })
    expect(second.state.enemy.statuses.brand).toBe(0)
  })

  it('adds to a warded hit too, but not to burn', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['strike'])
    start.enemy.statuses.brand = 3
    start.enemy.ward = 5
    const { events } = act(content, start, write([0]))
    expect(damageTo(events, 'enemy')[0]).toMatchObject({ amount: 2, absorbed: 5 })
  })
})

describe('stain', () => {
  it('hurts its holder whenever it casts, through wards, then drops by one', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['strike'] }] } })
    const start = duelWithHand(content, ['hex'])
    start.enemy.ward = 10
    const { events, state } = act(content, start, write([0]))
    expect(damageTo(events, 'enemy')).toEqual([
      { type: 'damage', target: 'enemy', amount: 3, absorbed: 0, source: 'stain' },
    ])
    expect(state.enemy.statuses.stain).toBe(2)
    const next = act(content, state, pass)
    expect(damageTo(next.events, 'enemy')[0]).toMatchObject({ amount: 2, source: 'stain' })
  })
})

describe('inspire', () => {
  it('draws extra words at the start of your next turn', () => {
    const content = makeContent({ enemy: quiet, player: { deck: Array(20).fill('strike') } })
    const { state } = act(
      content,
      duelWithHand(content, ['ponder', 'mend', 'mend', 'mend']),
      write([0]),
    )
    // Refilled to 4, then Inspire 2 draws 2 more at the start of the turn.
    expect(state.player.hand).toHaveLength(6)
    expect(state.player.statuses.inspire).toBe(0)
  })
})

describe('pierce', () => {
  it('a piercing hit ignores the ward and leaves it standing', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['mend'] }] } })
    const start = duelWithHand(content, ['lance'])
    start.enemy.ward = 8
    const { events, state } = act(content, start, write([0]))
    expect(damageTo(events, 'enemy')[0]).toMatchObject({ amount: 5, absorbed: 0 })
    expect(state.enemy.ward).toBe(8)
  })

  it('the Piercing modifier makes every hit of the spell pierce', () => {
    const result = composeSpell(makeContent(), ['strike', 'piercing', 'twice'])
    expect(result.ok && result.effects).toEqual([
      { kind: 'damage', amount: 4, pierce: true },
      { kind: 'damage', amount: 4, pierce: true },
    ])
  })
})

describe('cleanse (Purge)', () => {
  it('removes your harmful statuses and keeps the good ones', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['purge'])
    start.player.statuses = {
      ...start.player.statuses,
      burn: 5,
      chill: 3,
      brand: 2,
      stain: 4,
      thorns: 3,
    }
    const { state, events } = act(content, start, write([0]))
    expect(events).toContainEqual({ type: 'cleansed', side: 'player' })
    // Thorns survive (and fade by one at the start of your next turn).
    expect(state.player.statuses).toMatchObject({
      burn: 0,
      chill: 0,
      brand: 0,
      stain: 0,
      thorns: 2,
    })
  })
})

describe('intensify', () => {
  it('adds to every status the spell applies, inks included', () => {
    const result = composeSpell(makeContent(), ['strike', 'fire', 'intensify'])
    expect(result.ok && result.once).toEqual([
      { kind: 'damage', amount: 4 },
      { kind: 'applyStatus', status: 'burn', stacks: 4 },
    ])
  })
})

describe('lifesteal (Vampiric)', () => {
  it('heals half the damage actually dealt, rounded down', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['strike', 'vampiric', 'twice'])
    start.player.hp = 10
    const { events } = act(content, start, write([0, 1, 2]))
    expect(events.filter((event) => event.type === 'heal' && event.source === 'lifesteal')).toEqual(
      [
        { type: 'heal', target: 'player', amount: 2, source: 'lifesteal' },
        { type: 'heal', target: 'player', amount: 2, source: 'lifesteal' },
      ],
    )
  })

  it('heals nothing for warded damage', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['strike', 'vampiric'])
    start.enemy.ward = 10
    start.player.hp = 10
    const { events } = act(content, start, write([0, 1]))
    expect(events.some((event) => event.type === 'heal' && event.source === 'lifesteal')).toBe(
      false,
    )
  })
})

describe('redact', () => {
  it('can strike the verb: the rival spell fizzles', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['greater', 'strike'] }] } })
    const start = duelWithHand(content, ['redact', 'ward'])
    const { events, state } = act(content, start, write([0, 1], [1]))
    expect(events).toContainEqual({ type: 'wordErased', wordId: 'strike' })
    expect(damageTo(events, 'player')).toEqual([])
    expect(state.player.ward).toBe(6)
  })

  it('Erase still cannot strike the verb', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['greater', 'strike'] }] } })
    const start = duelWithHand(content, ['erase', 'ward'])
    expect(act(content, start, write([0, 1], [1])).events[0]).toEqual({
      type: 'commandRejected',
      reason: 'badEraseTarget',
    })
  })
})

describe('starting conditions', () => {
  it('rivals can start warded; players can start with statuses', () => {
    const content = makeContent({
      enemy: { startingWard: 4 },
      player: { startingStatuses: { focus: 2, thorns: 1 } },
    })
    const state = createDuel(content, 1)
    expect(state.enemy.ward).toBe(4)
    expect(state.player.statuses).toMatchObject({ focus: 2, thorns: 1, burn: 0 })
  })
})
