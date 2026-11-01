import { describe, expect, it } from 'vitest'
import { createCombat } from '../../src/engine/index.ts'
import { makeContent } from './fixtures.ts'

describe('createCombat', () => {
  it('fills the hand and puts the rest in the draw pile', () => {
    const content = makeContent({ player: { grimoire: ['bolt', 'ward', 'salve', 'study'] } })
    const state = createCombat(content, 1)
    expect(state.player.hand).toHaveLength(2)
    expect(state.player.drawPile).toHaveLength(2)
    expect(state.player.discardPile).toEqual([])

    const all = [...state.player.hand, ...state.player.drawPile]
    expect(all.map((card) => card.uid).sort()).toEqual([0, 1, 2, 3])
  })

  it('shuffles deterministically per seed', () => {
    const content = makeContent({
      player: { grimoire: ['bolt', 'ward', 'salve', 'study', 'costly', 'bolt', 'ward', 'salve'] },
    })
    expect(createCombat(content, 5)).toEqual(createCombat(content, 5))
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        createCombat(content, seed)
          .player.drawPile.map((card) => card.uid)
          .join(','),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })

  it('starts with a smaller hand when the grimoire is smaller than the hand size', () => {
    const state = createCombat(makeContent({ player: { grimoire: ['bolt'] } }), 1)
    expect(state.player.hand).toHaveLength(1)
  })

  it('sets up both combatants from the content', () => {
    const state = createCombat(makeContent({ player: { startingInk: 99 } }), 1)
    expect(state.player).toMatchObject({ hp: 30, maxHp: 30, shield: 0, ink: 5, ticksPerInk: 20 })
    expect(state.player.readyAt).toBe(0)
    expect(state.enemy).toMatchObject({ hp: 20, maxHp: 20, shield: 0, cast: null })
    expect(state.status).toBe('ongoing')
    expect(state.tick).toBe(0)
  })

  it('rejects unknown spell ids', () => {
    expect(() => createCombat(makeContent({ player: { grimoire: ['nope'] } }), 1)).toThrow(/nope/)
  })
})
