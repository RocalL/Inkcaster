import { describe, expect, it } from 'vitest'
import { RUN_CONTENT, getLoadout } from '../../src/data/index.ts'
import { LOADOUT_UNLOCK_COST, STARTING_WORDS } from '../../src/data/scriptorium.ts'
import { createRun, type RunState } from '../../src/engine/index.ts'
import { autoSpend } from '../../src/meta/autobuy.ts'
import {
  bankRun,
  buy,
  newProfile,
  practiceContentFor,
  priceOf,
  runContentFor,
  type Profile,
} from '../../src/meta/profile.ts'

const rich = (): Profile => ({ ...newProfile(), gold: 1000 })

describe('new profile', () => {
  it('starts small: the Apprentice and the core words', () => {
    const profile = newProfile()
    expect(profile.unlockedLoadouts).toEqual(['apprentice'])
    expect(profile.unlockedWords).toEqual(STARTING_WORDS)
    expect(profile.gold).toBe(0)
    expect(profile.currentRun).toBeNull()
  })

  it('only offers unlocked words as rewards', () => {
    const pool = runContentFor(newProfile()).rewardPool.map((reward) => reward.wordId)
    expect([...pool].sort()).toEqual([...STARTING_WORDS].sort())
  })
})

describe('buying', () => {
  it('a word joins the reward pool', () => {
    const profile = buy(rich(), { type: 'word', id: 'kindle' })
    expect(profile.gold).toBe(960)
    expect(runContentFor(profile).rewardPool.some((reward) => reward.wordId === 'kindle')).toBe(
      true,
    )
    expect(priceOf(profile, { type: 'word', id: 'kindle' })).toBeNull()
  })

  it('a loadout also unlocks its words', () => {
    const profile = buy(rich(), { type: 'loadout', id: 'pyromancer' })
    expect(profile.gold).toBe(1000 - LOADOUT_UNLOCK_COST)
    expect(profile.unlockedLoadouts).toContain('pyromancer')
    for (const id of getLoadout('pyromancer').deck) expect(profile.unlockedWords).toContain(id)
    expect(new Set(profile.unlockedWords).size).toBe(profile.unlockedWords.length)
  })

  it('rewrites go up to tier III, then stop; locked or numberless words cannot be rewritten', () => {
    let profile = buy(rich(), { type: 'rewrite', id: 'strike' })
    profile = buy(profile, { type: 'rewrite', id: 'strike' })
    expect(profile.rewrites.strike).toBe(3)
    expect(profile.gold).toBe(1000 - 30 - 60)
    expect(priceOf(profile, { type: 'rewrite', id: 'strike' })).toBeNull()
    expect(priceOf(profile, { type: 'rewrite', id: 'kindle' })).toBeNull()
    expect(priceOf(profile, { type: 'rewrite', id: 'twice' })).toBeNull()
    expect(runContentFor(profile).words.strike).toMatchObject({ effects: [{ amount: 6 }] })
  })

  it('bindings stack ranks up to their limit and change the run', () => {
    let profile = rich()
    for (let i = 0; i < 4; i++) profile = buy(profile, { type: 'binding', id: 'vellum_skin' })
    expect(profile.bindings.vellum_skin).toBe(3)
    profile = buy(profile, { type: 'binding', id: 'warded_cover' })
    profile = buy(profile, { type: 'binding', id: 'gilded_margins' })
    profile = buy(profile, { type: 'binding', id: 'wide_shelf' })

    const content = runContentFor(profile)
    expect(content.player.maxHp).toBe(RUN_CONTENT.player.maxHp + 15)
    expect(content.player.startingWard).toBe(3)
    expect(content.economy.goldMultiplier).toBeCloseTo(1.2)
    expect(content.economy.rewardChoices).toBe(RUN_CONTENT.economy.rewardChoices + 1)
    expect(practiceContentFor(profile, 'ash_adept', 'apprentice').player.maxHp).toBe(65)
  })

  it('refuses what you cannot afford, and unknown items', () => {
    const poor = newProfile()
    expect(buy(poor, { type: 'binding', id: 'vellum_skin' })).toBe(poor)
    expect(buy(rich(), { type: 'binding', id: 'nope' }).gold).toBe(1000)
    expect(buy(rich(), { type: 'loadout', id: 'apprentice' }).gold).toBe(1000)
  })
})

describe('bankRun', () => {
  const finished = (phase: 'won' | 'lost', gold: number, floor: number): RunState => ({
    ...createRun(RUN_CONTENT, [], 1),
    phase,
    gold,
    floor,
  })

  it('adds the run gold and updates the stats', () => {
    let profile = bankRun(newProfile(), finished('lost', 30, 4))
    expect(profile).toMatchObject({ gold: 30, currentRun: null })
    expect(profile.stats).toEqual({ runs: 1, wins: 0, bestFloors: 4, goldEarned: 30 })
    profile = bankRun(profile, finished('won', 120, 6))
    expect(profile.stats).toEqual({ runs: 2, wins: 1, bestFloors: 7, goldEarned: 150 })
    expect(profile.gold).toBe(150)
  })

  it('ignores runs that are not over', () => {
    const profile = newProfile()
    expect(bankRun(profile, createRun(RUN_CONTENT, [], 1))).toBe(profile)
  })
})

describe('autoSpend (sim policy)', () => {
  it('spends until nothing affordable is left', () => {
    const profile = autoSpend({ ...newProfile(), gold: 300 })
    expect(profile.gold).toBeLessThan(300)
    expect(profile.bindings.vellum_skin).toBeGreaterThan(0)
  })
})
