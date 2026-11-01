import { describe, expect, it } from 'vitest'
import { act, createDuel } from '../../src/engine/index.ts'
import { makeContent } from './fixtures.ts'

const quiet = { spells: [{ words: ['ward'] }] }

describe('hand and deck', () => {
  it('reshuffles the discard pile when the draw pile runs out', () => {
    const content = makeContent({
      enemy: quiet,
      player: { deck: ['strike', 'ward', 'mend', 'strike', 'ward'], handSize: 4 },
    })
    let state = createDuel(content, 1)
    expect(state.player.drawPile).toHaveLength(1)

    const discard = (words: number[]) => act(content, state, { type: 'discard', words })
    let result = discard([0, 1])
    // Two needed, one in the draw pile: the 2 discarded words are reshuffled back.
    expect(result.events).toContainEqual({ type: 'reshuffle', cards: 2 })
    expect(result.state.player.hand).toHaveLength(4)
    state = result.state
    result = discard([])
    expect(result.state.player.hand).toHaveLength(4)
  })

  it('every word stays in exactly one pile', () => {
    const content = makeContent({ enemy: { ...quiet, maxHp: 999 }, player: { maxHp: 999 } })
    let state = createDuel(content, 2)
    for (let i = 0; i < 20; i++) {
      state = act(content, state, { type: 'discard', words: i % 2 ? [0] : [1, 2] }).state
      const all = [...state.player.hand, ...state.player.drawPile, ...state.player.discardPile]
      expect(all.map((card) => card.uid).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    }
  })
})
