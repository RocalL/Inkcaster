import { useEffect } from 'react'
import { ENEMIES, LOADOUTS } from '../data/index.ts'
import { DuelScreen } from './combat/DuelScreen.tsx'
import { useDuelStore } from './combat/store.ts'
import { MenuScreen } from './MenuScreen.tsx'
import { ScriptoriumScreen } from './meta/ScriptoriumScreen.tsx'
import { SettingsScreen } from './meta/SettingsScreen.tsx'
import { useProfileStore } from './meta/store.ts'
import { RunScreen } from './run/RunScreen.tsx'
import { useRunStore } from './run/store.ts'
import './app.css'

export function App() {
  const loaded = useProfileStore((store) => store.loaded)
  const inScriptorium = useProfileStore((store) => store.scriptoriumOpen)
  const inSettings = useProfileStore((store) => store.settingsOpen)
  const inDuel = useDuelStore((store) => store.state !== null)
  const inRun = useRunStore((store) => store.run !== null)

  useEffect(() => {
    void useProfileStore.getState().load().then(startFromUrl)
  }, [])

  if (!loaded) return <main className="loading">Opening the grimoire…</main>
  if (inDuel) return <DuelScreen />
  if (inRun) return <RunScreen />
  if (inSettings) return <SettingsScreen />
  if (inScriptorium) return <ScriptoriumScreen />
  return <MenuScreen />
}

/**
 * Playtest shortcuts (they ignore unlocks): `?duel=ash_adept&loadout=warden&seed=42` opens that
 * duel; `?run=warden&seed=42` starts a run; `?scriptorium` opens the Scriptorium;
 * `?tutorial` starts the tutorial; `?settings` opens the settings.
 */
function startFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const seedParam = params.get('seed')
  const seed = seedParam === null ? undefined : Number(seedParam)

  if (params.has('tutorial')) {
    useDuelStore.getState().startTutorial()
    return
  }
  if (params.has('settings')) {
    useProfileStore.getState().openSettings()
    return
  }
  if (params.has('scriptorium')) {
    useProfileStore.getState().openScriptorium()
    return
  }
  const runLoadout = params.get('run')
  if (runLoadout && LOADOUTS.some((loadout) => loadout.id === runLoadout)) {
    useRunStore.getState().startRun(runLoadout, seed)
    return
  }
  const enemyId = params.get('duel')
  if (!enemyId || !ENEMIES.some((enemy) => enemy.id === enemyId)) return
  const loadout = params.get('loadout')
  const loadoutId = LOADOUTS.some((candidate) => candidate.id === loadout)
    ? (loadout ?? undefined)
    : undefined
  useDuelStore.getState().startDuel(enemyId, loadoutId, seed)
}
