import { useEffect } from 'react'
import { ENEMIES } from '../data/index.ts'
import { DuelScreen } from './combat/DuelScreen.tsx'
import { useDuelStore } from './combat/store.ts'
import { MenuScreen } from './MenuScreen.tsx'
import './app.css'

export function App() {
  const inDuel = useDuelStore((store) => store.state !== null)
  useDuelFromUrl()
  return inDuel ? <DuelScreen /> : <MenuScreen />
}

/** Playtest shortcut: `?duel=ash_adept&seed=42` opens that duel directly. */
function useDuelFromUrl(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const enemyId = params.get('duel')
    if (!enemyId || !ENEMIES.some((enemy) => enemy.id === enemyId)) return
    const seed = params.get('seed')
    useDuelStore.getState().startDuel(enemyId, seed === null ? undefined : Number(seed))
  }, [])
}
