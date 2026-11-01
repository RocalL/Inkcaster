import { describe, expect, it } from 'vitest'
import { WORDS_BY_ID } from '../../src/data/index.ts'
import { act } from '../../src/engine/index.ts'
import {
  COACH_STEPS,
  TUTORIAL_RIVAL,
  createTutorialDuel,
  currentCoachStep,
} from '../../src/meta/tutorial.ts'

describe('tutorial', () => {
  it('only uses real words', () => {
    const { state } = createTutorialDuel()
    const ids = [
      ...state.player.hand.map((card) => card.wordId),
      ...state.player.drawPile.map((card) => card.wordId),
      ...TUTORIAL_RIVAL.spells.flatMap((spell) => spell.words),
    ]
    for (const id of ids) expect(WORDS_BY_ID[id], id).toBeDefined()
  })

  it('can be played exactly as the coach says, step by step', () => {
    const { content, state: start } = createTutorialDuel()
    const view = (state = start, selection: number[] = [], eraseTargets: number[] = []) => ({
      state,
      content,
      selection,
      eraseTargets,
      pending: false,
    })
    const index = (state: typeof start, id: string) =>
      state.player.hand.findIndex((card) => card.wordId === id)

    expect(currentCoachStep(view())?.id).toBe('erase')
    const twice = start.enemy.intent.findIndex((word) => word.wordId === 'twice')
    const eraseSpell = [index(start, 'ward'), index(start, 'erase')]
    expect(currentCoachStep(view(start, eraseSpell, [twice]))?.id).toBe('cast-erase')

    const round2 = act(content, start, { type: 'write', words: eraseSpell, erase: [twice] }).state
    expect(round2.player.hp).toBe(40) // the single Strike was warded
    expect(currentCoachStep(view(round2))?.id).toBe('combo')

    const combo = ['strike', 'greater', 'twice'].map((id) => index(round2, id))
    expect(combo.every((i) => i >= 0)).toBe(true)
    const round3 = act(content, round2, { type: 'write', words: combo }).state
    expect(round3.enemy.hp).toBe(22 - 14)
    expect(currentCoachStep(view(round3))?.id).toBe('finish')
    expect(currentCoachStep(view({ ...round3, status: 'won' }))).toBeNull()
    expect(COACH_STEPS).toHaveLength(4)
  })
})
