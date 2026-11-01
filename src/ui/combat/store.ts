// UI-side duel store. It holds what the player is writing and feeds commands into the
// pure engine; components only read from it and call its actions. No game rules live here.

import { create } from 'zustand'
import { practiceContentFor } from '../../meta/profile.ts'
import { useProfileStore } from '../meta/store.ts'
import { playSound } from '../../audio/sfx.ts'
import { RIVAL_DELAY_MS } from '../../meta/settings.ts'
import { useSettingsStore } from '../meta/settings-store.ts'
import { createTutorialDuel } from '../../meta/tutorial.ts'
import { playFeedback } from './feedback.ts'
import {
  createDuel,
  playerTurn,
  rivalTurn,
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
  /** Practice duels can be replayed; run duels hand their result back to the run. */
  mode: 'practice' | 'run' | 'tutorial'
  /** Hand indices being written, in order. */
  selection: number[]
  /** Rival intent indices chosen for the selected edit words. */
  eraseTargets: number[]
  /** Floating numbers from the last action; replaced on every action. */
  floaters: Floater[]
  log: LogLine[]
  rejection: { reason: RejectReason; id: number } | null
  /** Your spell has resolved and the rival's turn is about to play: input is locked. */
  pending: boolean
  /** The sentence just cast, shown large for a moment. `id` changes on every cast. */
  lastCast: { side: Side; words: string[]; id: number } | null
  /** Changes when a fighter is hit, to replay the shake animation. */
  hits: Record<Side, number>
  nextId: number

  /** Practice duel against any rival with the chosen loadout. */
  startDuel: (enemyId: string, loadoutId?: string, seed?: number) => void
  /** A duel whose content and state come from elsewhere (a run floor). */
  startRunDuel: (content: DuelContent, state: DuelState) => void
  /** The guided first duel. */
  startTutorial: () => void
  leaveDuel: () => void
  toggleWord: (handIndex: number) => void
  toggleErase: (intentIndex: number) => void
  clearSelection: () => void
  cast: () => void
  discardAndPass: () => void
  /** Plays the pending rival turn now (the timer calls it; tests call it directly). */
  finishRivalTurn: () => void
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
  pending: false,
  lastCast: null,
  hits: { player: 0, enemy: 0 },
  nextId: 0,
}

let rivalTimer: ReturnType<typeof setTimeout> | null = null

function clearRivalTimer(): void {
  if (rivalTimer !== null) clearTimeout(rivalTimer)
  rivalTimer = null
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

  /** Shows the events of one half-turn: floaters, log, cast banner, hit shakes, sound and ink. */
  const show = (events: CombatEvent[], next: DuelState) => {
    const { content, state, nextId: firstId } = get()
    if (!content || !state) return
    let nextId = firstId
    const floaters = floatersFor(events).map((floater, order) => ({
      ...floater,
      order,
      id: nextId++,
    }))
    const lines = events.flatMap((event) => {
      const text = describeEvent(event, content)
      return text ? [{ id: nextId++, text, round: state.round }] : []
    })
    const cast = [...events]
      .reverse()
      .find((event) => event.type === 'spellWritten' || event.type === 'echo')
    const hits = { ...get().hits }
    for (const event of events) {
      if (event.type === 'damage' && event.amount > 0) hits[event.target] = nextId++
    }
    set({
      state: next,
      floaters,
      log: [...get().log, ...lines].slice(-LOG_LENGTH),
      lastCast:
        cast && (cast.type === 'spellWritten' || cast.type === 'echo')
          ? { side: cast.side, words: cast.words, id: nextId++ }
          : get().lastCast,
      hits,
      nextId,
    })
    playFeedback(events)
  }

  const send = (command: PlayerCommand) => {
    const { content, state, pending, nextId } = get()
    if (!content || !state || state.status !== 'ongoing' || pending) return
    const result = playerTurn(content, state, command)

    if (result.state === state) {
      const rejected = result.events.find((event) => event.type === 'commandRejected')
      if (rejected) set({ rejection: { reason: rejected.reason, id: nextId }, nextId: nextId + 1 })
      return
    }

    set({ selection: [], eraseTargets: [], rejection: null })
    show(result.events, result.state)
    if (result.state.status !== 'ongoing') return
    set({ pending: true })
    const delay = RIVAL_DELAY_MS[useSettingsStore.getState().settings.pacing]
    clearRivalTimer()
    rivalTimer = setTimeout(() => get().finishRivalTurn(), delay)
  }

  return {
    ...idle,
    startDuel: (enemyId, loadoutId, seed = randomSeed()) => {
      clearRivalTimer()
      const { profile } = useProfileStore.getState()
      const content = practiceContentFor(profile, enemyId, loadoutId ?? profile.selectedLoadout)
      set({ ...idle, content, enemyId, state: createDuel(content, seed) })
    },

    startRunDuel: (content, state) => {
      clearRivalTimer()
      set({ ...idle, content, enemyId: content.enemy.id, mode: 'run', state })
    },

    startTutorial: () => {
      clearRivalTimer()
      const { content, state } = createTutorialDuel()
      set({ ...idle, content, enemyId: content.enemy.id, mode: 'tutorial', state })
    },

    leaveDuel: () => {
      clearRivalTimer()
      set(idle)
    },

    finishRivalTurn: () => {
      clearRivalTimer()
      const { content, state, pending } = get()
      if (!content || !state || !pending) return
      const result = rivalTurn(content, state)
      set({ pending: false })
      show(result.events, result.state)
    },

    toggleWord: (handIndex) => {
      const { content, state, selection, pending } = get()
      if (!content || !state || pending || !state.player.hand[handIndex]) return
      playSound('pick')
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
