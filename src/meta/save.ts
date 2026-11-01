// Versioned save. The profile (including the run in progress) is stored as
// { version, profile } in IndexedDB. Every change to the saved shape bumps SAVE_VERSION and
// adds a migration from the previous version, so old saves keep loading.

import { get, set } from 'idb-keyval'
import { cleanProfile, newProfile, type Profile, type SavedRun } from './profile.ts'

export const SAVE_VERSION = 2
export const SAVE_KEY = 'inkcaster/profile'

export interface SaveFile {
  version: number
  profile: Profile
}

/** MIGRATIONS[n] turns a version n save into a version n + 1 save. Never edit an old entry. */
const MIGRATIONS: Record<number, (save: SaveFile) => SaveFile> = {
  // v2 (Phase 6): ascension levels; a saved run remembers its ascension.
  1: (save) => {
    const old = save.profile as Omit<Profile, 'ascensionUnlocked' | 'selectedAscension'> & {
      currentRun: Omit<SavedRun, 'ascension'> | null
    }
    return {
      version: 2,
      profile: {
        ...old,
        ascensionUnlocked: 0,
        selectedAscension: 0,
        currentRun: old.currentRun ? { ...old.currentRun, ascension: 0 } : null,
      },
    }
  },
}

export function serialize(profile: Profile): SaveFile {
  return { version: SAVE_VERSION, profile }
}

/** Reads any stored value back into a valid profile. Unknown or broken data gives a new one. */
export function deserialize(raw: unknown): Profile {
  if (!isSaveFile(raw) || raw.version > SAVE_VERSION) return newProfile()
  let save = raw
  while (save.version < SAVE_VERSION) {
    const migrate = MIGRATIONS[save.version]
    if (!migrate) return newProfile()
    save = migrate(save)
  }
  // Fill fields a hand-edited or partial save may lack, then drop ids that no longer exist.
  const fresh = newProfile()
  return cleanProfile({
    ...fresh,
    ...save.profile,
    stats: { ...fresh.stats, ...save.profile.stats },
  })
}

function isSaveFile(value: unknown): value is SaveFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<SaveFile>
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.profile === 'object' &&
    candidate.profile !== null
  )
}

/** Where saves go. IndexedDB in the browser; tests pass an in-memory store. */
export interface SaveStorage {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
}

export const browserStorage: SaveStorage = { get, set }

/** How long to wait for storage before playing without saving. */
export const LOAD_TIMEOUT_MS = 2000

export interface LoadResult {
  profile: Profile
  /**
   * False when storage failed or did not answer in time. The game then must not save:
   * writing a fresh profile could overwrite a real save that was only slow to load.
   */
  persistent: boolean
}

export async function loadProfile(
  storage: SaveStorage = browserStorage,
  timeoutMs = LOAD_TIMEOUT_MS,
): Promise<LoadResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  try {
    const raw = await Promise.race([storage.get(SAVE_KEY), timeout])
    if (raw === 'timeout') return { profile: newProfile(), persistent: false }
    return { profile: deserialize(raw), persistent: true }
  } catch {
    // Private windows or blocked storage: play without saving.
    return { profile: newProfile(), persistent: false }
  } finally {
    clearTimeout(timer)
  }
}

export async function saveProfile(
  profile: Profile,
  storage: SaveStorage = browserStorage,
): Promise<void> {
  try {
    await storage.set(SAVE_KEY, serialize(profile))
  } catch {
    // Saving is best effort; the game keeps working in memory.
  }
}
