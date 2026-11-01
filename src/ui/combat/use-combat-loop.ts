import { useEffect } from 'react'
import { useCombatStore } from './store.ts'

/** Drives the store from requestAnimationFrame. */
export function useCombatLoop(): void {
  useEffect(() => {
    const { frame } = useCombatStore.getState()
    let last = performance.now()
    let handle = requestAnimationFrame(function loop(now) {
      frame(now - last)
      last = now
      handle = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(handle)
  }, [])
}

/** Keyboard: 1-7 cast that page, Space or G gathers ink, F toggles fast time. */
export function useCombatKeys(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const { cast, gatherInk, toggleFlow } = useCombatStore.getState()
      const key = event.key.toLowerCase()
      if (key >= '1' && key <= '7') {
        cast(Number(key) - 1)
      } else if (key === ' ' || key === 'g') {
        event.preventDefault()
        gatherInk()
      } else if (key === 'f') {
        toggleFlow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
