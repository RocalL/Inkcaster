import { describe, expect, it } from 'vitest'
import { advance, cast, makeCombat, makeContent, run } from './fixtures.ts'

describe('ink', () => {
  it('regenerates one ink per second of timeline and caps at max', () => {
    const content = makeContent({ player: { startingInk: 0, maxInk: 2 } })
    const start = makeCombat(content)
    expect(advance(content, start, 19).state.player.ink).toBe(0)
    expect(advance(content, start, 20).state.player.ink).toBe(1)
    expect(advance(content, start, 40).state.player.ink).toBe(2)
    expect(advance(content, start, 200).state.player.ink).toBe(2)
  })

  it('does not regenerate while time is frozen on the player turn', () => {
    const content = makeContent({ player: { startingInk: 0 } })
    const { state } = run(content, makeCombat(content), 50)
    expect(state.tick).toBe(0)
    expect(state.player.ink).toBe(0)
  })

  it('casting spends ink', () => {
    const content = makeContent()
    const { state } = run(content, makeCombat(content), 1, [cast(0)])
    expect(state.player.ink).toBe(4)
  })
})

describe('hand', () => {
  it('a cast page is discarded and replaced in the same position', () => {
    const content = makeContent({ player: { grimoire: ['bolt', 'ward', 'salve', 'bolt'] } })
    const start = makeCombat(content)
    const [castCard, keptCard] = start.player.hand
    const nextCard = start.player.drawPile[0]

    const { state, events } = run(content, start, 1, [cast(0)])
    expect(state.player.hand).toEqual([nextCard, keptCard])
    expect(state.player.discardPile).toEqual([castCard])
    expect(events).toContainEqual({ type: 'cardDrawn', slot: 0, spellId: nextCard?.spellId })
  })

  it('reshuffles the discard pile when the draw pile is empty', () => {
    const content = makeContent({ player: { grimoire: ['bolt', 'bolt', 'bolt'] } })
    let state = makeCombat(content)
    state = run(content, state, 1, [cast(0)]).state // draws the last page
    expect(state.player.drawPile).toHaveLength(0)
    state = advance(content, state, 19).state

    const { state: after, events } = run(content, state, 1, [cast(1)])
    expect(events).toContainEqual({ type: 'reshuffle', cards: 2 })
    expect(after.player.hand).toHaveLength(2)
  })

  it('with a one-page grimoire, the cast page is reshuffled straight back', () => {
    const content = makeContent({ player: { grimoire: ['bolt'], handSize: 2 } })
    const start = makeCombat(content)
    expect(start.player.hand).toHaveLength(1)
    const { state } = run(content, start, 1, [cast(0)])
    expect(state.player.hand).toHaveLength(1)
  })

  it('casting does not refill above the starting hand size', () => {
    const content = makeContent({
      player: { grimoire: ['study', 'bolt', 'bolt', 'bolt', 'bolt', 'bolt'], handSize: 2 },
    })
    const state = makeCombat(content)
    state.player.hand = [
      { uid: 0, spellId: 'study' },
      { uid: 1, spellId: 'bolt' },
      { uid: 2, spellId: 'bolt' },
    ]
    state.player.drawPile = [{ uid: 3, spellId: 'bolt' }]
    const { state: after } = run(content, state, 1, [cast(1)])
    expect(after.player.hand.map((card) => card.uid)).toEqual([0, 2])
  })
})

describe('turns', () => {
  it('a cast moves the next turn forward by the spell time', () => {
    const content = makeContent()
    const { state } = run(content, makeCombat(content), 1, [cast(0)])
    expect(state.player.readyAt).toBe(20)
    expect(advance(content, state, 18).state.tick).toBe(19)
  })

  it('time freezes again when the next turn comes', () => {
    const content = makeContent()
    let state = run(content, makeCombat(content), 1, [cast(0)]).state
    state = run(content, state, 100).state
    expect(state.tick).toBe(20)
  })

  it('gathering ink lets one second pass', () => {
    const content = makeContent()
    const { state, events } = run(content, makeCombat(content), 1, [{ type: 'wait' }])
    expect(state.player.readyAt).toBe(20)
    expect(events).toContainEqual({ type: 'wait', ticks: 20 })
  })
})

describe('command rejection', () => {
  it('rejects a slot that does not exist, and time stays frozen', () => {
    const content = makeContent()
    const start = makeCombat(content)
    const { state, events } = run(content, start, 1, [cast(7)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 7, reason: 'noSuchSlot' })
    expect(state).toBe(start)
  })

  it('rejects a spell the player cannot afford, without side effects', () => {
    const content = makeContent({ player: { grimoire: ['costly', 'costly'], startingInk: 4 } })
    const start = makeCombat(content)
    const { state, events } = run(content, start, 1, [cast(0)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 0, reason: 'notEnoughInk' })
    expect(state).toBe(start)
  })

  it('rejects commands when it is not the player turn', () => {
    const content = makeContent()
    const afterCast = run(content, makeCombat(content), 1, [cast(0)]).state
    const { state, events } = run(content, afterCast, 1, [cast(0)])
    expect(events).toContainEqual({ type: 'commandRejected', slot: 0, reason: 'notYourTurn' })
    expect(state.player.ink).toBe(afterCast.player.ink)
  })
})
