// UI-side duel store. It holds what the player is writing and feeds commands into the
// pure engine; components only read from it and call its actions. No game rules live here.

import { create } from 'zustand'
import { DEFAULT_LOADOUT_ID, duelContent } from '../../data/index.ts'
import {
  act,
  createDuel,
  getWord,
  type CombatEvent,
  type DuelContent,
  type DuelState,
  type PlayerCommand,
  type RejectReason,
  type Side,
} from '../../engine/index.ts'
import { describeEvent } from '../text.ts'

export type FloaterKind = 'damage' | 'burn' | 'warded' | 'heal' | 'ward'

export interface Floater {
  id: number
  side: Side
  kind: FloaterKind
  amount: number
  /** Order within the action, so hits appear one after another. */
  order: number
}

export interface LogLine {
  id: number
  text: string
  /** The round it happened in, to group lines. */
  round: number
}

const LOG_LENGTH = 14

interface DuelStore {
  content: DuelContent | null
  state: DuelState | null
  enemyId: string | null
  loadoutId: string
  /** Practice duels can be replayed; run duels hand their result back to the run. */
  mode: 'practice' | 'run'
  /** Hand indices being written, in order. */
  selection: number[]
  /** Rival intent indices chosen for the selected edit words. */
  eraseTargets: number[]
  /** Floating numbers from the last action; replaced on every action. */
  floaters: Floater[]
  log: LogLine[]
  rejection: { reason: RejectReason; id: number } | null
  nextId: number

  setLoadout: (loadoutId: string) => void
  /** Practice duel against any rival with the chosen loadout. */
  startDuel: (enemyId: string, loadoutId?: string, seed?: number) => void
  /** A duel whose content and state come from elsewhere (a run floor). */
  startRunDuel: (content: DuelContent, state: DuelState) => void
  leaveDuel: () => void
  toggleWord: (handIndex: number) => void
  toggleErase: (intentIndex: number) => void
  clearSelection: () => void
  cast: () => void
  discardAndPass: () => void
}

const idle = {
  content: null,
  state: null,
  enemyId: null,
  mode: 'practice' as const,
  selection: [],
  eraseTargets: [],
  floaters: [],
  log: [],
  rejection: null,
  nextId: 0,
}

export const useDuelStore = create<DuelStore>()((set, get) => {
  /** Number of edit words (Erase...) in the current selection. */
  const editsSelected = (): number => {
    const { content, state, selection } = get()
    if (!content || !state) return 0
    return selection.filter((index) => {
      const card = state.player.hand[index]
      return card && getWord(content, card.wordId).kind === 'edit'
    }).length
  }

  /** Sentence length allowed for this selection (Verbose adds slots). */
  const maxWordsFor = (selection: number[]): number => {
    const { content, state } = get()
    if (!content || !state) return 0
    return selection.reduce((max, index) => {
      const card = state.player.hand[index]
      const word = card && getWord(content, card.wordId)
      return word?.kind === 'modifier' && word.modifier.type === 'expand'
        ? max + word.modifier.words
        : max
    }, content.player.maxWords)
  }

  const send = (command: PlayerCommand) => {
    const { content, state, nextId: firstId } = get()
    if (!content || !state || state.status !== 'ongoing') return
    const result = act(content, state, command)
    let nextId = firstId

    if (result.state === state) {
      const rejected = result.events.find((event) => event.type === 'commandRejected')
      if (rejected) set({ rejection: { reason: rejected.reason, id: nextId++ }, nextId })
      return
    }

    const floaters = floatersFor(result.events).map((floater, order) => ({
      ...floater,
      order,
      id: nextId++,
    }))
    const lines = result.events.flatMap((event) => {
      const text = describeEvent(event, content)
      return text ? [{ id: nextId++, text, round: state.round }] : []
    })
    set({
      state: result.state,
      selection: [],
      eraseTargets: [],
      floaters,
      log: [...get().log, ...lines].slice(-LOG_LENGTH),
      rejection: null,
      nextId,
    })
  }

  return {
    ...idle,
    loadoutId: DEFAULT_LOADOUT_ID,

    setLoadout: (loadoutId) => set({ loadoutId }),

    startDuel: (enemyId, loadoutId = get().loadoutId, seed = randomSeed()) => {
      const content = duelContent(enemyId, loadoutId)
      set({ ...idle, content, enemyId, loadoutId, state: createDuel(content, seed) })
    },

    startRunDuel: (content, state) =>
      set({ ...idle, content, enemyId: content.enemy.id, mode: 'run', state }),

    // Keeps the chosen loadout for the next duel.
    leaveDuel: () => set(idle),

    toggleWord: (handIndex) => {
      const { content, state, selection } = get()
      if (!content || !state || !state.player.hand[handIndex]) return
      if (selection.includes(handIndex)) {
        set({ selection: selection.filter((index) => index !== handIndex), rejection: null })
        // Dropping an edit word may leave too many erase targets.
        const edits = editsSelected()
        set((store) => ({ eraseTargets: store.eraseTargets.slice(0, edits) }))
      } else if (selection.length < maxWordsFor([...selection, handIndex])) {
        set({ selection: [...selection, handIndex], rejection: null })
      }
    },

    toggleErase: (intentIndex) => {
      const { eraseTargets } = get()
      if (eraseTargets.includes(intentIndex)) {
        set({ eraseTargets: eraseTargets.filter((index) => index !== intentIndex) })
      } else if (eraseTargets.length < editsSelected()) {
        set({ eraseTargets: [...eraseTargets, intentIndex] })
      }
    },

    clearSelection: () => set({ selection: [], eraseTargets: [], rejection: null }),

    cast: () => {
      const { selection, eraseTargets } = get()
      send({ type: 'write', words: selection, erase: eraseTargets })
    },

    discardAndPass: () => send({ type: 'discard', words: get().selection }),
  }
})

function floatersFor(events: CombatEvent[]): Omit<Floater, 'id' | 'order'>[] {
  return events.flatMap((event): Omit<Floater, 'id' | 'order'>[] => {
    switch (event.type) {
      case 'damage': {
        const result: Omit<Floater, 'id' | 'order'>[] = []
        if (event.absorbed > 0)
          result.push({ side: event.target, kind: 'warded', amount: event.absorbed })
        if (event.amount > 0 || event.absorbed === 0) {
          const kind = event.source === 'burn' ? 'burn' : 'damage'
          result.push({ side: event.target, kind, amount: event.amount })
        }
        return result
      }
      case 'heal':
        return event.amount > 0 ? [{ side: event.target, kind: 'heal', amount: event.amount }] : []
      case 'shield':
        return [{ side: event.target, kind: 'ward', amount: event.amount }]
      default:
        return []
    }
  })
}

/** UI-side randomness is fine: the seed is an input to the deterministic engine. */
function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
