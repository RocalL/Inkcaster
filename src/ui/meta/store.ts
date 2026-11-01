// UI-side profile store: loads the save once, applies purchases and saves after every change.
// The rules (prices, unlocks, banking) live in src/meta.

import { create } from 'zustand'
import { buy, newProfile, type Profile, type Purchase } from '../../meta/profile.ts'
import { loadProfile, saveProfile } from '../../meta/save.ts'

interface ProfileStore {
  profile: Profile
  loaded: boolean
  /** False when storage is unavailable: progress lives in memory only. */
  persistent: boolean
  scriptoriumOpen: boolean
  load: () => Promise<void>
  /** Replaces the profile and saves it. */
  update: (change: (profile: Profile) => Profile) => void
  buy: (purchase: Purchase) => void
  selectLoadout: (loadoutId: string) => void
  selectAscension: (level: number) => void
  openScriptorium: () => void
  closeScriptorium: () => void
}

export const useProfileStore = create<ProfileStore>()((set, get) => ({
  profile: newProfile(),
  loaded: false,
  persistent: false,
  scriptoriumOpen: false,

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

  buy: (purchase) => get().update((profile) => buy(profile, purchase)),

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
}))
