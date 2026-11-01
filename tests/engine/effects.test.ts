// Every effect kind and status, exercised through real player actions.

import { describe, expect, it } from 'vitest'
import { MAX_HAND_SIZE, act } from '../../src/engine/index.ts'
import { duelWithHand, makeContent } from './fixtures.ts'

/** Rival that never hurts the player: it only wards itself. */
const quietEnemy = { spells: [{ words: ['ward'] }] }

describe('damage', () => {
  it('hits the rival', () => {
    const content = makeContent({ enemy: quietEnemy })
    const { state, events } = act(content, duelWithHand(content, ['strike']), {
      type: 'write',
      words: [0],
    })
    expect(state.enemy.hp).toBe(26)
    expect(events).toContainEqual({ type: 'damage', target: 'enemy', amount: 4, absorbed: 0 })
  })

  it('kills at 0 hp, ends the duel and stops everything after', () => {
    const content = makeContent({ enemy: { maxHp: 4 } })
    const { state, events } = act(content, duelWithHand(content, ['strike', 'twice']), {
      type: 'write',
      words: [0, 1],
    })
    expect(state.status).toBe('won')
    expect(state.enemy.hp).toBe(0)
    expect(events.filter((event) => event.type === 'damage')).toHaveLength(1)
    expect(events).toContainEqual({ type: 'death', side: 'enemy' })
    expect(events.some((event) => event.type === 'spellWritten' && event.side === 'enemy')).toBe(
      false,
    )
  })

  it('the player can lose', () => {
    const content = makeContent({ player: { maxHp: 4 } })
    const { state } = act(content, duelWithHand(content, ['ward']), { type: 'discard', words: [] })
    expect(state.status).toBe('lost')
  })
})

describe('ward (shield)', () => {
  it('absorbs only the next hit, then the rest is lost', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['strike', 'twice'] }] } })
    const { state, events } = act(content, duelWithHand(content, ['ward']), {
      type: 'write',
      words: [0],
    })
    // Ward 6 absorbs the first Strike (4), then is gone: the second Strike lands in full.
    expect(events).toContainEqual({ type: 'damage', target: 'player', amount: 0, absorbed: 4 })
    expect(events).toContainEqual({ type: 'damage', target: 'player', amount: 4, absorbed: 0 })
    expect(state.player).toMatchObject({ hp: 26, ward: 0 })
  })

  it('stays up until a hit comes', () => {
    const content = makeContent({ enemy: quietEnemy })
    const { state } = act(content, duelWithHand(content, ['ward']), { type: 'write', words: [0] })
    expect(state.player.ward).toBe(6)
  })
})

describe('heal', () => {
  it('heals, capped at max hp', () => {
    const content = makeContent()
    const start = duelWithHand(content, ['mend'])
    start.player.hp = 28
    const { state, events } = act(content, start, { type: 'write', words: [0] })
    expect(events).toContainEqual({ type: 'heal', target: 'player', amount: 2 })
    expect(state.player.hp).toBe(30 - 4) // then the rival's Strike lands
  })
})

describe('burn (applyStatus)', () => {
  it('applies stacks, burns at the start of the victim turn through wards, then fades', () => {
    const content = makeContent({ enemy: { spells: [{ words: ['ward'] }] } })
    const start = duelWithHand(content, ['fire', 'strike', 'mend', 'mend'])
    start.enemy.ward = 10

    const first = act(content, start, { type: 'write', words: [0, 1] })
    expect(first.events).toContainEqual({
      type: 'statusApplied',
      target: 'enemy',
      status: 'burn',
      stacks: 2,
    })
    // Strike hit the ward; burn then ticks for 2 at the start of the rival turn, ignoring wards.
    expect(first.events).toContainEqual({
      type: 'damage',
      target: 'enemy',
      amount: 2,
      absorbed: 0,
      source: 'burn',
    })
    expect(first.state.enemy).toMatchObject({ hp: 28, statuses: { burn: 1, chill: 0 } })

    const second = act(content, first.state, { type: 'discard', words: [] })
    expect(second.state.enemy).toMatchObject({ hp: 27, statuses: { burn: 0, chill: 0 } })
  })
})

describe('chill (applyStatus)', () => {
  it("weakens each hit of the victim's next spell, then clears", () => {
    const content = makeContent({ enemy: { spells: [{ words: ['strike', 'twice'] }] } })
    const first = act(content, duelWithHand(content, ['ice', 'strike']), {
      type: 'write',
      words: [0, 1],
    })
    // Rival's two Strikes of 4 are chilled by 3: 1 + 1.
    expect(first.state.player.hp).toBe(28)
    expect(first.state.enemy.statuses.chill).toBe(0)

    const second = act(content, first.state, { type: 'discard', words: [] })
    expect(second.state.player.hp).toBe(20)
  })
})

describe('draw', () => {
  it('adds words to the hand during the turn', () => {
    const content = makeContent({ player: { handSize: 2 }, enemy: quietEnemy })
    const start = duelWithHand(content, ['arcane', 'strike', 'mend'])
    const { state, events } = act(content, start, { type: 'write', words: [0, 1] })
    // Hand: mend + 1 drawn by Arcane = 2, so refilling to 2 draws nothing more.
    expect(state.player.hand).toHaveLength(2)
    expect(events.filter((event) => event.type === 'wordDrawn')).toHaveLength(1)
  })

  it(`never grows the hand above ${MAX_HAND_SIZE}`, () => {
    const content = makeContent({
      player: { deck: Array(30).fill('strike') },
      enemy: quietEnemy,
    })
    const start = duelWithHand(content, ['arcane', 'strike', ...Array(MAX_HAND_SIZE).fill('mend')])
    const { state } = act(content, start, { type: 'write', words: [0, 1] })
    expect(state.player.hand.length).toBeLessThanOrEqual(MAX_HAND_SIZE)
  })

  it('does nothing for the rival', () => {
    const content = makeContent({
      enemy: { spells: [{ words: ['strike', 'arcane'] }] },
    })
    const start = duelWithHand(content, ['mend'])
    const { events } = act(content, start, { type: 'write', words: [0] })
    // Only the player's refill draws happen (hand back to 4).
    expect(events.filter((event) => event.type === 'wordDrawn')).toHaveLength(4)
  })
})
