// UI-side run store. The run rules live in engine/run.ts; this holds the current run, saves it
// in the profile between duels, banks its gold when it ends, and hands each floor's duel to
// the duel store.

import { create } from 'zustand'
import {
  chooseReward,
  createRun,
  enterDuel,
  finishDuel,
  floorDuelContent,
  startFloorDuel,
  type DuelState,
  type RunContent,
  type RunState,
} from '../../engine/index.ts'
import { bankRun, runContentFor, runDeckFor } from '../../meta/profile.ts'
import { useDuelStore } from '../combat/store.ts'
import { useProfileStore } from '../meta/store.ts'

interface RunStore {
  run: RunState | null
  loadoutId: string | null
  /** Ascension level of the current run. */
  ascension: number
  /** Run content with the profile's rewrites and bindings, fixed for the whole run. */
  content: RunContent | null
  startRun: (loadoutId: string, seed?: number) => void
  /** Picks up the run saved in the profile. */
  resumeRun: () => void
  /** Map -> duel: opens the current floor's duel in the duel store. */
  enterDuel: () => void
  finishDuel: (duel: DuelState) => void
  chooseReward: (wordId: string | null) => void
  /** Leaves the end screen, or abandons a run in progress (no gold). */
  leaveRun: () => void
}

export const useRunStore = create<RunStore>()((set, get) => {
  /** Sets the run and keeps the profile in step: saved while running, banked once over. */
  const setRun = (run: RunState) => {
    const { loadoutId, ascension } = get()
    set({ run })
    useProfileStore
      .getState()
      .update((profile) =>
        run.phase === 'won' || run.phase === 'lost'
          ? bankRun(profile, run, ascension)
          : { ...profile, currentRun: loadoutId ? { loadoutId, ascension, run } : null },
      )
  }

  return {
    run: null,
    loadoutId: null,
    ascension: 0,
    content: null,

    startRun: (loadoutId, seed = Math.floor(Math.random() * 2 ** 31)) => {
      const { profile } = useProfileStore.getState()
      const ascension = profile.selectedAscension
      const content = runContentFor(profile, ascension)
      set({ loadoutId, ascension, content })
      setRun(createRun(content, runDeckFor(profile, loadoutId), seed))
    },

    resumeRun: () => {
      const { profile } = useProfileStore.getState()
      const saved = profile.currentRun
      if (!saved) return
      set({
        run: saved.run,
        loadoutId: saved.loadoutId,
        ascension: saved.ascension,
        content: runContentFor(profile, saved.ascension),
      })
    },

    enterDuel: () => {
      const { run, content } = get()
      if (!run || !content || (run.phase !== 'map' && run.phase !== 'duel')) return
      // Re-entering a duel that was left (e.g. after a reload) restarts it with the same seed.
      const next = run.phase === 'map' ? enterDuel(run) : run
      setRun(next)
      useDuelStore
        .getState()
        .startRunDuel(floorDuelContent(content, next), startFloorDuel(content, next))
    },

    finishDuel: (duel) => {
      const { run, content } = get()
      if (run && content) setRun(finishDuel(content, run, duel))
    },

    chooseReward: (wordId) => {
      const { run, content } = get()
      if (run && content) setRun(chooseReward(run, wordId, content.economy))
    },

    leaveRun: () => {
      const { run } = get()
      if (run && run.phase !== 'won' && run.phase !== 'lost') {
        useProfileStore.getState().update((profile) => ({ ...profile, currentRun: null }))
      }
      set({ run: null, loadoutId: null, ascension: 0, content: null })
    },
  }
})
