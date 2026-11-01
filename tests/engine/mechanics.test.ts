// Phase 3 mechanics: scaling damage, minions, counter, focus, thorns, regen, echo, verbose.

import { describe, expect, it } from 'vitest'
import {
  MAX_MINIONS,
  act,
  composeSpell,
  previewSpell,
  type CombatEvent,
  type DuelState,
} from '../../src/engine/index.ts'
import { duelWithHand, makeContent } from './fixtures.ts'

/** Rival that never hurts the player: it only wards itself. */
const quiet = { spells: [{ words: ['ward'] }] }

const write = (words: number[], erase?: number[]) => ({ type: 'write' as const, words, erase })
const pass = { type: 'discard' as const, words: [] }

function damageTo(events: CombatEvent[], target: 'player' | 'enemy') {
  return events.flatMap((event) =>
    event.type === 'damage' && event.target === target ? [event] : [],
  )
}

describe('scaling damage', () => {
  it('Ignite deals more per Burn on the target, and keeps the Burn', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['ignite'])
    start.enemy.statuses.burn = 3
    const { events, state } = act(content, start, write([0]))
    expect(damageTo(events, 'enemy')[0]).toMatchObject({ amount: 8 })
    // Burn then ticks at the start of the rival turn (3), and halves to 1.
    expect(state.enemy.statuses.burn).toBe(1)
  })

  it('Shatter consumes Chill: only the first hit of a Twice spell gets the bonus', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['shatter', 'twice'])
    start.enemy.statuses.chill = 2
    const { events, state } = act(content, start, write([0, 1]))
    expect(damageTo(events, 'enemy').map((event) => event.amount)).toEqual([9, 3])
    expect(state.enemy.statuses.chill).toBe(0)
  })

  it('Riposte deals your ward and keeps it', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['riposte'])
    start.player.ward = 7
    const { events, state } = act(content, start, write([0]))
    expect(damageTo(events, 'enemy')[0]).toMatchObject({ amount: 7 })
    expect(state.player.ward).toBe(7)
  })

  it('Litany counts the words of its own spell', () => {
    const content = makeContent({ enemy: quiet })
    const { events } = act(
      content,
      duelWithHand(content, ['litany', 'fire', 'greater']),
      write([0, 1, 2]),
    )
    // 0 + 3 (Greater) + 3 words x 2.
    expect(damageTo(events, 'enemy')[0]).toMatchObject({ amount: 9 })
  })

  it('previewSpell shows scaled numbers', () => {
    const content = makeContent()
    const state = duelWithHand(content, ['ignite', 'twice'])
    state.enemy.statuses.burn = 2
    const preview = previewSpell(content, state, [0, 1])
    expect(preview.ok && preview.effects).toEqual([
      { kind: 'damage', amount: 6, target: undefined },
      { kind: 'damage', amount: 6, target: undefined },
    ])
  })
})

describe('minions (summon, rally)', () => {
  it('a summoned familiar strikes at the end of your turn, then fades', () => {
    const content = makeContent({ enemy: quiet })
    let state: DuelState = duelWithHand(content, ['call'])
    const first = act(content, state, write([0]))
    expect(first.events).toContainEqual({
      type: 'minionSummoned',
      side: 'player',
      name: 'Inkling',
      attack: 2,
      turns: 2,
    })
    expect(damageTo(first.events, 'enemy')).toEqual([
      { type: 'damage', target: 'enemy', amount: 2, absorbed: 0, source: 'minion' },
    ])
    state = first.state
    expect(state.player.minions).toMatchObject([{ name: 'Inkling', turnsLeft: 1 }])

    // Rival warded itself (6): the second strike is absorbed, then the Inkling fades.
    const second = act(content, state, pass)
    expect(damageTo(second.events, 'enemy')[0]).toMatchObject({ amount: 0, absorbed: 2 })
    expect(second.events).toContainEqual({ type: 'minionFaded', side: 'player', name: 'Inkling' })
    expect(second.state.player.minions).toEqual([])
  })

  it('Twice summons two; the side holds at most MAX_MINIONS', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['call', 'twice'])
    start.player.minions = Array.from({ length: MAX_MINIONS - 1 }, (_, uid) => ({
      uid: 50 + uid,
      name: 'Old',
      attack: 0,
      turnsLeft: 5,
    }))
    const { state } = act(content, start, write([0, 1]))
    expect(state.player.minions).toHaveLength(MAX_MINIONS)
  })

  it('Rally makes every familiar strike now, with a bonus, without ageing them', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['mend'] }] } })
    const start = duelWithHand(content, ['rally'])
    start.player.minions = [
      { uid: 1, name: 'A', attack: 2, turnsLeft: 3 },
      { uid: 2, name: 'B', attack: 3, turnsLeft: 3 },
    ]
    const { events, state } = act(content, start, write([0]))
    // Rally: 3 + 4, then the end-of-turn strikes: 2 + 3.
    expect(damageTo(events, 'enemy').map((event) => event.amount)).toEqual([3, 4, 2, 3])
    expect(state.player.minions.map((minion) => minion.turnsLeft)).toEqual([2, 2])
  })

  it('rival familiars work the same way', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['call'] }] } })
    const { state, events } = act(content, duelWithHand(content, ['mend']), pass)
    expect(state.enemy.minions).toHaveLength(1)
    expect(damageTo(events, 'player')).toEqual([
      { type: 'damage', target: 'player', amount: 2, absorbed: 0, source: 'minion' },
    ])
  })
})

describe('counter (Blot)', () => {
  it("cancels the rival's next spell", () => {
    const content = makeContent()
    const { state, events } = act(content, duelWithHand(content, ['blot']), write([0]))
    expect(events).toContainEqual({ type: 'spellCountered', side: 'enemy' })
    expect(damageTo(events, 'player')).toEqual([])
    expect(state.enemy.countered).toBe(false)
    expect(state.enemy.spellsCast).toBe(1)
  })

  it('does nothing when the rival casts it', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['blot'] }] } })
    const { state, events } = act(content, duelWithHand(content, ['strike']), write([0]))
    expect(events).toContainEqual({ type: 'spellWritten', side: 'enemy', words: ['blot'] })
    expect(state.enemy.countered).toBe(false)
    expect(events.some((event) => event.type === 'spellCountered')).toBe(false)
  })
})

describe('self statuses', () => {
  it('Focus boosts the next spell only (Greater rules), then clears', () => {
    const content = makeContent({ enemy: quiet })
    const first = act(content, duelWithHand(content, ['focus', 'strike', 'strike']), write([0]))
    expect(first.state.player.statuses.focus).toBe(4)

    const second = act(content, first.state, write([0]))
    expect(damageTo(second.events, 'enemy')[0]).toMatchObject({ absorbed: 6, amount: 2 })
    expect(second.state.player.statuses.focus).toBe(0)
  })

  it('Thorns hit back when struck, even through a ward, and fade by one each turn', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['strike', 'twice'] }] } })
    const { state, events } = act(content, duelWithHand(content, ['ward', 'thorn']), write([0, 1]))
    expect(damageTo(events, 'enemy')).toEqual([
      { type: 'damage', target: 'enemy', amount: 3, absorbed: 0, source: 'thorns' },
      { type: 'damage', target: 'enemy', amount: 3, absorbed: 0, source: 'thorns' },
    ])
    // Thorns 3, -1 at the start of your next turn.
    expect(state.player.statuses.thorns).toBe(2)
  })

  it('Regen heals at the start of your turn, then fades by one', () => {
    const content = makeContent()
    const start = duelWithHand(content, ['mend', 'verdant'])
    start.player.hp = 10
    const { state, events } = act(content, start, write([0, 1]))
    // Mend 5 -> 15, rival Strike -> 11, Regen 3 at your turn start -> 14.
    expect(events).toContainEqual({ type: 'heal', target: 'player', amount: 3, source: 'regen' })
    expect(state.player.hp).toBe(14)
    expect(state.player.statuses.regen).toBe(2)
  })
})

describe('Echo', () => {
  it('recasts the spell at the start of your next turn, once', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['mend'] }] } })
    const { state, events } = act(content, duelWithHand(content, ['strike', 'echo']), write([0, 1]))
    expect(events).toContainEqual({ type: 'echo', side: 'player', words: ['strike', 'echo'] })
    expect(damageTo(events, 'enemy').map((event) => event.amount)).toEqual([4, 4])
    expect(state.player.echo).toBeNull()
  })
})

describe('Verbose', () => {
  it('allows longer sentences', () => {
    const content = makeContent({ enemy: quiet })
    const start = duelWithHand(content, ['strike', 'verbose', 'greater', 'twice'])
    expect(act(content, start, write([0, 2, 3, 1])).state).not.toBe(start)
    expect(act(content, start, write([0, 2, 3])).state).not.toBe(start)
    const tooLong = duelWithHand(content, ['strike', 'greater', 'twice', 'fire'])
    expect(act(content, tooLong, write([0, 1, 2, 3])).events[0]).toEqual({
      type: 'commandRejected',
      reason: 'tooManyWords',
    })
  })

  it('composeSpell reports echo and extra words', () => {
    const result = composeSpell(makeContent(), ['strike', 'echo', 'verbose'])
    expect(result.ok && [result.echo, result.extraWords, result.wordCount]).toEqual([true, 2, 3])
  })
})
