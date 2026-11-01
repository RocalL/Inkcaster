import { describe, expect, it } from 'vitest'
import { RUN_CONTENT } from '../../src/data/index.ts'
import { createRun } from '../../src/engine/index.ts'
import { buy, newProfile } from '../../src/meta/profile.ts'
import {
  SAVE_KEY,
  SAVE_VERSION,
  deserialize,
  loadProfile,
  saveProfile,
  serialize,
  type SaveStorage,
} from '../../src/meta/save.ts'

function memoryStorage(): SaveStorage & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return {
    data,
    get: async (key) => structuredClone(data.get(key)),
    set: async (key, value) => {
      data.set(key, structuredClone(value))
    },
  }
}

describe('save format', () => {
  it('is versioned', () => {
    expect(serialize(newProfile())).toEqual({ version: SAVE_VERSION, profile: newProfile() })
  })

  it('round-trips a profile with purchases and a run in progress', () => {
    let profile = buy({ ...newProfile(), gold: 500 }, { type: 'loadout', id: 'warden' })
    profile = buy(profile, { type: 'rewrite', id: 'strike' })
    profile = {
      ...profile,
      currentRun: { loadoutId: 'warden', run: createRun(RUN_CONTENT, ['strike'], 3) },
    }
    expect(deserialize(structuredClone(serialize(profile)))).toEqual(profile)
  })

  it('gives a new profile for missing, broken or future saves', () => {
    expect(deserialize(undefined)).toEqual(newProfile())
    expect(deserialize('garbage')).toEqual(newProfile())
    expect(deserialize({ version: SAVE_VERSION + 1, profile: {} })).toEqual(newProfile())
    expect(deserialize({ version: 0, profile: {} })).toEqual(newProfile())
  })

  it('fills missing fields and drops ids that no longer exist', () => {
    const profile = deserialize({
      version: SAVE_VERSION,
      profile: {
        gold: 12,
        unlockedWords: ['strike', 'removed_word'],
        unlockedLoadouts: ['removed_loadout'],
        bindings: { vellum_skin: 1, removed_binding: 2 },
        rewrites: { removed_word: 2 },
      },
    })
    expect(profile.gold).toBe(12)
    expect(profile.unlockedWords).toEqual(['strike'])
    expect(profile.unlockedLoadouts).toEqual(['apprentice'])
    expect(profile.bindings).toEqual({ vellum_skin: 1 })
    expect(profile.rewrites).toEqual({})
    expect(profile.stats.runs).toBe(0)
    expect(profile.selectedLoadout).toBe('apprentice')
  })
})

describe('storage', () => {
  it('saves under one key and loads it back', async () => {
    const storage = memoryStorage()
    const profile = { ...newProfile(), gold: 42 }
    await saveProfile(profile, storage)
    expect(storage.data.get(SAVE_KEY)).toEqual(serialize(profile))
    expect(await loadProfile(storage)).toEqual({ profile, persistent: true })
  })

  it('a new player (nothing saved yet) can save', async () => {
    expect(await loadProfile(memoryStorage())).toEqual({
      profile: newProfile(),
      persistent: true,
    })
  })

  it('storage that never answers: play without saving', async () => {
    const hanging: SaveStorage = { get: () => new Promise(() => {}), set: async () => {} }
    expect(await loadProfile(hanging, 10)).toEqual({ profile: newProfile(), persistent: false })
  })

  it('falls back to a new profile when storage fails', async () => {
    const failing: SaveStorage = {
      get: () => Promise.reject(new Error('blocked')),
      set: () => Promise.reject(new Error('blocked')),
    }
    expect(await loadProfile(failing)).toEqual({ profile: newProfile(), persistent: false })
    await expect(saveProfile(newProfile(), failing)).resolves.toBeUndefined()
  })
})
