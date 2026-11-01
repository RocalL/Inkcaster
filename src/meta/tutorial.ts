// The guided first duel: a fixed hand and a scripted rival, with coach steps that advance
// as the player does what they say. Built from the real engine; only the setup is special.

import { WORDS_BY_ID } from '../data/index.ts'
import { createDuel, type DuelContent, type DuelState, type EnemyDef } from '../engine/index.ts'

export const TUTORIAL_RIVAL: EnemyDef = {
  id: 'straw_scribe',
  name: 'Straw Scribe',
  maxHp: 22,
  behaviour: 'rotation',
  spells: [{ words: ['strike', 'twice'] }, { words: ['ward'] }, { words: ['fire', 'strike'] }],
}

const HAND = ['ward', 'erase', 'strike', 'greater', 'twice', 'fire']
const DRAW_PILE = ['strike', 'mend', 'twice', 'strike', 'ice', 'greater', 'ward', 'strike']

export function createTutorialDuel(): { content: DuelContent; state: DuelState } {
  const deck = [...HAND, ...DRAW_PILE]
  const content: DuelContent = {
    words: WORDS_BY_ID,
    player: { maxHp: 40, handSize: 6, maxWords: 3, deck },
    enemy: TUTORIAL_RIVAL,
  }
  const state = createDuel(content, 1)
  // A known hand and draw order, so the coach can name the right words.
  state.player.hand = HAND.map((wordId, uid) => ({ uid, wordId }))
  state.player.drawPile = DRAW_PILE.map((wordId, i) => ({ uid: HAND.length + i, wordId }))
  state.player.discardPile = []
  return { content, state }
}

export interface CoachView {
  state: DuelState
  content: DuelContent
  selection: number[]
  eraseTargets: number[]
  pending: boolean
}

export interface CoachStep {
  id: string
  text: string
  /** When true, the coach moves on to the next step. */
  done: (view: CoachView) => boolean
}

const selected = (view: CoachView, wordId: string) =>
  view.selection.some((index) => view.state.player.hand[index]?.wordId === wordId)

export const COACH_STEPS: readonly CoachStep[] = [
  {
    id: 'erase',
    text: "The Straw Scribe's next spell is written above: “Strike Twice” hits you twice for 4. Rewrite it! Pick Erase and Ward, then click “Twice” in its spell.",
    // Also done once the duel has moved on, so the coach never steps back.
    done: (view) =>
      view.state.round >= 2 ||
      (selected(view, 'erase') &&
        selected(view, 'ward') &&
        view.eraseTargets.some((index) => view.state.enemy.intent[index]?.wordId === 'twice')),
  },
  {
    id: 'cast-erase',
    text: 'Your spell will ward you and strike out “Twice”. Cast it (Enter).',
    done: (view) => view.state.round >= 2 && !view.pending,
  },
  {
    id: 'combo',
    text: 'The Scribe will raise a Ward: it absorbs only the next hit. Hit hard first: write Strike, Greater and Twice, then cast.',
    done: (view) => view.state.round >= 3 && !view.pending,
  },
  {
    id: 'finish',
    text: 'Underlined words like Burn or Ward explain themselves: hover or tap them. Now finish the duel your way.',
    done: (view) => view.state.status !== 'ongoing',
  },
]

/** The step to show, or null when the tutorial is over. */
export function currentCoachStep(view: CoachView): CoachStep | null {
  return COACH_STEPS.find((step) => !step.done(view)) ?? null
}
