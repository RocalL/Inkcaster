import { beforeEach, describe, expect, it } from 'vitest'
import { getSpell } from '../../src/engine/index.ts'
import { FLOATER_LIFETIME_MS, useCombatStore } from '../../src/ui/combat/store.ts'

const store = () => useCombatStore.getState()

/** Index of a slot the player can afford right now, optionally one that deals damage. */
function affordableSlot(damaging = false): number {
  const { state, content } = store()
  if (!state || !content) throw new Error('No duel')
  const index = state.player.hand.findIndex((card) => {
    const spell = getSpell(content, card.spellId)
    const deals = spell.effects.some((effect) => effect.kind === 'damage')
    return spell.cost <= state.player.ink && (!damaging || deals)
  })
  if (index < 0) throw new Error('Seed 1 has no matching page in the opening hand')
  return index
}

describe('combat store', () => {
  beforeEach(() => store().startDuel('ash_adept', 1))

  it('time is frozen on the player turn', () => {
    store().frame(500)
    expect(store().state?.tick).toBe(0)
  })

  it('a cast resolves on the next frame, then the timeline flows until the next turn', () => {
    const slot = affordableSlot()
    const inkBefore = store().state?.player.ink ?? 0
    store().cast(slot)
    expect(store().queued).toEqual({ type: 'cast', slot })

    store().frame(0)
    expect(store().queued).toBeNull()
    expect(store().state?.player.ink).toBeLessThan(inkBefore)
    expect(store().state?.player.discardPile).toHaveLength(1)
    expect(store().state?.tick).toBe(1)

    store().frame(50)
    expect(store().state?.tick).toBe(2)
    for (let i = 0; i < 100; i++) store().frame(50)
    expect(store().state?.tick).toBe(store().state?.player.readyAt)
  })

  it('only one command per turn', () => {
    store().gatherInk()
    store().cast(0)
    expect(store().queued).toEqual({ type: 'wait' })
  })

  it('fast time plays the timeline 2.5x faster', () => {
    store().gatherInk()
    store().frame(0)
    store().toggleFlow()
    store().frame(100)
    expect(store().state?.tick).toBe(1 + 5)
  })

  it('shows floating numbers for damage, then clears them', () => {
    store().cast(affordableSlot(true))
    store().frame(0)
    expect(store().floaters.some((f) => f.side === 'enemy' && f.kind === 'damage')).toBe(true)
    store().frame(FLOATER_LIFETIME_MS)
    expect(store().floaters).toEqual([])
  })

  it('leaving resets to the menu', () => {
    store().leaveDuel()
    expect(store().state).toBeNull()
  })
})
