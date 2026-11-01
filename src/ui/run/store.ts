// UI-side run store. The run rules live in engine/run.ts; this only holds the current run
// and hands each floor's duel to the duel store.

import { create } from 'zustand'
import { RUN_CONTENT, getLoadout } from '../../data/index.ts'
import {
  chooseReward,
  createRun,
  enterDuel,
  finishDuel,
  floorDuelContent,
  startFloorDuel,
  type DuelState,
  type RunState,
} from '../../engine/index.ts'
import { useDuelStore } from '../combat/store.ts'

interface RunStore {
  run: RunState | null
  loadoutId: string | null
  startRun: (loadoutId: string, seed?: number) => void
  /** Map -> duel: opens the current floor's duel in the duel store. */
  enterDuel: () => void
  finishDuel: (duel: DuelState) => void
  chooseReward: (wordId: string | null) => void
  leaveRun: () => void
}

export const useRunStore = create<RunStore>()((set, get) => ({
  run: null,
  loadoutId: null,

  startRun: (loadoutId, seed = Math.floor(Math.random() * 2 ** 31)) => {
    set({ run: createRun(RUN_CONTENT, getLoadout(loadoutId).deck, seed), loadoutId })
  },

  enterDuel: () => {
    const { run } = get()
    if (!run || (run.phase !== 'map' && run.phase !== 'duel')) return
    // Re-entering a duel that was left (e.g. after a reload) restarts it with the same seed.
    const next = run.phase === 'map' ? enterDuel(run) : run
    set({ run: next })
    useDuelStore
      .getState()
      .startRunDuel(floorDuelContent(RUN_CONTENT, next), startFloorDuel(RUN_CONTENT, next))
  },

  finishDuel: (duel) => {
    const { run } = get()
    if (run) set({ run: finishDuel(RUN_CONTENT, run, duel) })
  },

  chooseReward: (wordId) => {
    const { run } = get()
    if (run) set({ run: chooseReward(run, wordId) })
  },

  leaveRun: () => set({ run: null, loadoutId: null }),
}))
