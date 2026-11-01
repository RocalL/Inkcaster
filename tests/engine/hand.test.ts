import { describe, expect, it } from 'vitest'
import { cast, makeCombat, makeContent, run } from './fixtures.ts'

describe('ink', () => {
  it('regenerates one ink per second and caps at max', () => {
    const content = makeContent({ player: { startingInk: 0, maxInk: 2 } })
    const start = makeCombat(content)
    expect(run(content, start, 19).state.player.ink).toBe(0)
    expect(run(content, start, 20).state.player.ink).toBe(1)
    expect(run(content, start, 40).state.player.ink).toBe(2)
    expect(run(content, start, 200).state.player.ink).toBe(2)
  })

  it('casting spends ink', () => {
    const content = makeContent()
    const { state } = run(content, makeCombat(content), 1, [cast(0)])
    expect(state.player.ink).toBe(4)
  })
})

describe('hand cycle', () => {
  it('casting discards the page and recharges the slot for the spell cooldown', () => {
    const content = makeContent()
    const start = makeCombat(content)
    const castUid = start.player.hand[0]?.card?.uid

    const after = run(content, start, 1, [cast(0)]).state
    expect(after.player.hand[0]).toEqual({ card: null, cooldown: 19 })
    expect(after.player.discardPile.map((card) => card.uid)).toEqual([castUid])
  })

  it('draws the next page when the cooldown ends (1s = 20 ticks)', () => {
    const content = makeContent()
    const start = makeCombat(content)
    const nextUid = start.player.drawPile[0]?.uid

    expect(run(content, start, 19, [cast(0)]).state.player.hand[0]?.card).toBeNull()
    const { state, events } = run(content, start, 20, [cast(0)])
    expect(state.player.hand[0]?.card?.uid).toBe(nextUid)
    expect(events).toContainEqual({ type: 'cardDrawn', slot: 0, spellId: 'bolt' })
  })

  it('reshuffles the discard pile when the draw pile is empty', () => {
    const content = makeContent({ player: { grimoire: ['bolt', 'bolt', 'bolt'] } })
    let state = makeCombat(content)
    state = run(content, state, 20, [cast(0)]).state // draws the last page
    expect(state.player.drawPile).toHaveLength(0)

    const { state: after, events } = run(content, state, 20, [cast(1)])
    expect(events).toContainEqual({ type: 'reshuffle', cards: 2 })
    expect(after.player.hand.every((slot) => slot.card)).toBe(true)
    expect(after.player.discardPile).toHaveLength(0)
  })

  it('a slot waits empty while every page is in hand, then refills once one is cast', () => {
    const content = makeContent({ player: { grimoire: ['bolt'], handSize: 2 } })
    let state = makeCombat(content)
    state = run(content, state, 30).state
    expect(state.player.hand.filter((slot) => slot.card)).toHaveLength(1)

    const castSlot = state.player.hand.findIndex((slot) => slot.card)
    const otherSlot = 1 - castSlot
    state = run(content, state, 1, [cast(castSlot)]).state
    expect(state.player.hand[otherSlot]?.card?.uid).toBe(0)
  })
})

describe('cast rejection', () => {
  it('rejects a slot that does not exist', () => {
    const content = makeContent()
    const { events } = run(content, makeCombat(content), 1, [cast(7)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 7, reason: 'noSuchSlot' })
  })

  it('rejects a recharging slot', () => {
    const content = makeContent()
    const { state, events } = run(content, makeCombat(content), 1, [cast(0), cast(0)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 0, reason: 'slotRecharging' })
    expect(state.player.ink).toBe(4)
  })

  it('rejects a spell the player cannot afford, without side effects', () => {
    const content = makeContent({ player: { grimoire: ['costly', 'costly'], startingInk: 4 } })
    const start = makeCombat(content)
    const { state, events } = run(content, start, 1, [cast(0)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 0, reason: 'notEnoughInk' })
    expect(state.player.hand).toEqual(start.player.hand)
    expect(state.enemy.hp).toBe(20)
  })
})
