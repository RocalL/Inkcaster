import { beforeEach, describe, expect, it } from 'vitest'
import { getWord } from '../../src/engine/index.ts'
import { useDuelStore } from '../../src/ui/combat/store.ts'

const store = () => useDuelStore.getState()

/** Hand index of the first word of that kind (throws if the hand has none). */
function handIndexOf(kind: 'verb' | 'modifier' | 'ink' | 'edit'): number {
  const { state, content } = store()
  if (!state || !content) throw new Error('No duel')
  const index = state.player.hand.findIndex((card) => getWord(content, card.wordId).kind === kind)
  if (index < 0) throw new Error(`Hand has no ${kind}`)
  return index
}

describe('duel store', () => {
  beforeEach(() => {
    store().startDuel('ash_adept', 1)
    // Make the opening hand predictable.
    const state = store().state
    if (!state) throw new Error('No duel')
    state.player.hand = ['strike', 'twice', 'fire', 'erase', 'ward', 'mend'].map((wordId, i) => ({
      uid: 100 + i,
      wordId,
    }))
  })

  it('selects words in order, up to three, and toggles them off', () => {
    store().toggleWord(0)
    store().toggleWord(1)
    store().toggleWord(2)
    store().toggleWord(4)
    expect(store().selection).toEqual([0, 1, 2])
    store().toggleWord(1)
    expect(store().selection).toEqual([0, 2])
  })

  it('casting sends the selection to the engine and clears it', () => {
    const hpBefore = store().state?.enemy.hp ?? 0
    store().toggleWord(handIndexOf('verb'))
    store().toggleWord(1)
    store().cast()
    expect(store().selection).toEqual([])
    expect(store().state?.enemy.hp).toBe(hpBefore - 8)
    expect(store().state?.round).toBe(2)
    expect(store().floaters.length).toBeGreaterThan(0)
    expect(store().log.length).toBeGreaterThan(0)
  })

  it('a rejected cast keeps the state and explains why', () => {
    const before = store().state
    store().toggleWord(1)
    store().cast()
    expect(store().state).toBe(before)
    expect(store().rejection?.reason).toBe('needOneVerb')
  })

  it('erase targets need an edit word selected, one per edit', () => {
    store().toggleErase(0)
    expect(store().eraseTargets).toEqual([])
    store().toggleWord(handIndexOf('edit'))
    store().toggleErase(0)
    store().toggleErase(1)
    expect(store().eraseTargets).toEqual([0])
    store().toggleWord(handIndexOf('edit'))
    expect(store().eraseTargets).toEqual([])
  })

  it('discard and pass ends the turn', () => {
    store().toggleWord(1)
    store().discardAndPass()
    expect(store().state?.round).toBe(2)
    expect(store().state?.player.discardPile.map((card) => card.wordId)).toEqual(['twice'])
  })

  it('leaving resets to the menu', () => {
    store().leaveDuel()
    expect(store().state).toBeNull()
  })
})
