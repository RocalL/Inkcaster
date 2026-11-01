// UI-side settings store: applies settings to audio, the ink layer and the page, and saves them.

import { create } from 'zustand'
import { setAudioSettings } from '../../audio/sfx.ts'
import { loadSettings, saveSettings, type Settings } from '../../meta/settings.ts'
import { setInkEnabled } from '../../vfx/ink-layer.ts'

interface SettingsStore {
  settings: Settings
  change: (patch: Partial<Settings>) => void
}

export function prefersReducedMotion(settings: Settings): boolean {
  if (settings.motion !== 'system') return settings.motion === 'reduced'
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Pushes settings to the systems that read them. */
function apply(settings: Settings): void {
  setAudioSettings(settings)
  const reduced = prefersReducedMotion(settings)
  setInkEnabled(!reduced)
  const root = globalThis.document?.documentElement
  if (root) {
    root.dataset.motion = reduced ? 'reduced' : 'full'
    root.dataset.textSize = settings.textSize
  }
}

const initial = loadSettings()
apply(initial)

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: initial,
  change: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    apply(settings)
    saveSettings(settings)
  },
}))
