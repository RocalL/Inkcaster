// UI-side combat store. It plays the timeline in real time between the player's turns and
// feeds commands into the pure engine; components only read from it and call its actions.
// No game rules live here.

import { create } from 'zustand'
import { starterDuel } from '../../data/index.ts'
import {
  advanceClock,
  createCombat,
  isPlayerTurn,
  step,
  type CombatContent,
  type CombatEvent,
  type CombatState,
  type PlayerCommand,
  type Side,
} from '../../engine/index.ts'
import { describeEvent } from '../text.ts'

export type FloaterKind = 'damage' | 'blocked' | 'heal' | 'shield'

export interface Floater {
  id: number
  side: Side
  kind: FloaterKind
  amount: number
  /** Real-time ms (see `clockMs`) when it appeared. */
  bornAt: number
}

export interface LogLine {
  id: number
  text: string
}

export const FLOATER_LIFETIME_MS = 1100
const LOG_LENGTH = 8
/** How fast the timeline plays between turns. */
export const FLOW_SPEEDS = { normal: 1, fast: 2.5 } as const
export type FlowSpeed = keyof typeof FLOW_SPEEDS

interface CombatStore {
  content: CombatContent | null
  state: CombatState | null
  enemyId: string | null
  flow: FlowSpeed
  accumulatorMs: number
  /** Real time since the duel started. Drives UI animations. */
  clockMs: number
  /** The command chosen this turn, sent on the next frame. */
  queued: PlayerCommand | null
  /** Hand index the player is hovering, for the timeline preview. */
  preview: number | null
  floaters: Floater[]
  log: LogLine[]
  /** Last rejected cast, so the card can shake. `id` changes on every rejection. */
  rejection: { slot: number; id: number } | null
  nextId: number

  startDuel: (enemyId: string, seed?: number) => void
  leaveDuel: () => void
  cast: (slot: number) => void
  gatherInk: () => void
  setPreview: (slot: number | null) => void
  toggleFlow: () => void
  frame: (elapsedMs: number) => void
}

const idle = {
  content: null,
  state: null,
  enemyId: null,
  accumulatorMs: 0,
  clockMs: 0,
  queued: null,
  preview: null,
  floaters: [],
  log: [],
  rejection: null,
  nextId: 0,
}

export const useCombatStore = create<CombatStore>()((set, get) => {
  const command = (next: PlayerCommand) => {
    const { state, queued } = get()
    if (!state || !isPlayerTurn(state) || queued) return
    set({ queued: next, preview: null })
  }

  return {
    ...idle,
    flow: 'normal',

    startDuel: (enemyId, seed = randomSeed()) => {
      const content = starterDuel(enemyId)
      set({ ...idle, content, enemyId, state: createCombat(content, seed) })
    },

    leaveDuel: () => set(idle),
    cast: (slot) => command({ type: 'cast', slot }),
    gatherInk: () => command({ type: 'wait' }),
    setPreview: (preview) => set({ preview }),
    toggleFlow: () => set((store) => ({ flow: store.flow === 'normal' ? 'fast' : 'normal' })),

    frame: (elapsedMs) => {
      const store = get()
      const { content } = store
      let { state } = store
      if (!content || !state) return

      const clockMs = store.clockMs + elapsedMs
      const events: CombatEvent[] = []
      let accumulatorMs = 0

      if (store.queued) {
        // The turn's command resolves immediately, then the timeline starts flowing.
        const result = step(content, state, [store.queued])
        state = result.state
        events.push(...result.events)
      } else if (!isPlayerTurn(state) && state.status === 'ongoing') {
        const clock = advanceClock(store.accumulatorMs, elapsedMs, FLOW_SPEEDS[store.flow])
        accumulatorMs = clock.accumulatorMs
        for (let i = 0; i < clock.steps && !isPlayerTurn(state); i++) {
          const result = step(content, state)
          state = result.state
          events.push(...result.events)
        }
      }

      let nextId = store.nextId
      const floaters = store.floaters.filter((f) => clockMs - f.bornAt < FLOATER_LIFETIME_MS)
      const log = [...store.log]
      let rejection = store.rejection
      for (const event of events) {
        for (const floater of floatersFor(event)) {
          floaters.push({ ...floater, id: nextId++, bornAt: clockMs })
        }
        if (event.type === 'commandRejected' && event.slot !== undefined) {
          rejection = { slot: event.slot, id: nextId++ }
        }
        const text = event.type === 'cardDrawn' ? null : describeEvent(event, content)
        if (text) log.push({ id: nextId++, text })
      }

      set({
        state,
        clockMs,
        accumulatorMs,
        queued: null,
        floaters,
        log: log.slice(-LOG_LENGTH),
        rejection,
        nextId,
      })
    },
  }
})

function floatersFor(event: CombatEvent): Omit<Floater, 'id' | 'bornAt'>[] {
  switch (event.type) {
    case 'damage': {
      const result: Omit<Floater, 'id' | 'bornAt'>[] = []
      if (event.amount > 0)
        result.push({ side: event.target, kind: 'damage', amount: event.amount })
      if (event.absorbed > 0)
        result.push({ side: event.target, kind: 'blocked', amount: event.absorbed })
      return result
    }
    case 'heal':
      return event.amount > 0 ? [{ side: event.target, kind: 'heal', amount: event.amount }] : []
    case 'shield':
      return [{ side: event.target, kind: 'shield', amount: event.amount }]
    default:
      return []
  }
}

/** UI-side randomness is fine: the seed is an input to the deterministic engine. */
function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
