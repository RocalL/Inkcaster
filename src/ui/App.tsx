import { useEffect } from 'react'
import { ENEMIES, LOADOUTS } from '../data/index.ts'
import { DuelScreen } from './combat/DuelScreen.tsx'
import { useDuelStore } from './combat/store.ts'
import { MenuScreen } from './MenuScreen.tsx'
import { RunScreen } from './run/RunScreen.tsx'
import { useRunStore } from './run/store.ts'
import './app.css'

export function App() {
  const inDuel = useDuelStore((store) => store.state !== null)
  const inRun = useRunStore((store) => store.run !== null)
  useDuelFromUrl()
  if (inDuel) return <DuelScreen />
  if (inRun) return <RunScreen />
  return <MenuScreen />
}

/**
 * Playtest shortcuts: `?duel=ash_adept&loadout=warden&seed=42` opens that duel directly;
 * `?run=warden&seed=42` starts a run with that loadout.
 */
function useDuelFromUrl(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const runLoadout = params.get('run')
    if (runLoadout && LOADOUTS.some((loadout) => loadout.id === runLoadout)) {
      const seed = params.get('seed')
      useRunStore.getState().startRun(runLoadout, seed === null ? undefined : Number(seed))
      return
    }
    const enemyId = params.get('duel')
    if (!enemyId || !ENEMIES.some((enemy) => enemy.id === enemyId)) return
    const loadout = params.get('loadout')
    const loadoutId = LOADOUTS.some((candidate) => candidate.id === loadout)
      ? (loadout ?? undefined)
      : undefined
    const seed = params.get('seed')
    useDuelStore.getState().startDuel(enemyId, loadoutId, seed === null ? undefined : Number(seed))
  }, [])
}
