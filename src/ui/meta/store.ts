// UI-side profile store: loads the save once, applies purchases and saves after every change.
// The rules (prices, unlocks, banking) live in src/meta.

import { create } from 'zustand'
import { playSound } from '../../audio/sfx.ts'
import { buy, newProfile, type Profile, type Purchase } from '../../meta/profile.ts'
import { loadProfile, saveProfile } from '../../meta/save.ts'

interface ProfileStore {
  profile: Profile
  loaded: boolean
  /** False when storage is unavailable: progress lives in memory only. */
  persistent: boolean
  scriptoriumOpen: boolean
  settingsOpen: boolean
  load: () => Promise<void>
  /** Replaces the profile and saves it. */
  update: (change: (profile: Profile) => Profile) => void
  buy: (purchase: Purchase) => void
  selectLoadout: (loadoutId: string) => void
  selectAscension: (level: number) => void
  openScriptorium: () => void
  closeScriptorium: () => void
  openSettings: () => void
  closeSettings: () => void
  /** Wipes all progress: gold, unlocks, rewrites, bindings, stats, saved run. */
  resetProgress: () => void
}

export const useProfileStore = create<ProfileStore>()((set, get) => ({
  profile: newProfile(),
  loaded: false,
  persistent: false,
  scriptoriumOpen: false,
  settingsOpen: false,

  load: async () => {
    const { profile, persistent } = await loadProfile()
    set({ profile, persistent, loaded: true })
  },

  update: (change) => {
    const profile = change(get().profile)
    if (profile === get().profile) return
    set({ profile })
    if (get().persistent) void saveProfile(profile)
  },

  buy: (purchase) => {
    const before = get().profile
    get().update((profile) => buy(profile, purchase))
    if (get().profile !== before) playSound('reward')
  },

  selectLoadout: (loadoutId) =>
    get().update((profile) =>
      profile.unlockedLoadouts.includes(loadoutId)
        ? { ...profile, selectedLoadout: loadoutId }
        : profile,
    ),

  selectAscension: (level) =>
    get().update((profile) =>
      level >= 0 && level <= profile.ascensionUnlocked
        ? { ...profile, selectedAscension: level }
        : profile,
    ),

  openScriptorium: () => set({ scriptoriumOpen: true }),
  closeScriptorium: () => set({ scriptoriumOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  resetProgress: () => get().update(() => newProfile()),
}))
