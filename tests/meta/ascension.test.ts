import { describe, expect, it } from 'vitest'
import { RUN_CONTENT, getLoadout } from '../../src/data/index.ts'
import { MAX_ASCENSION } from '../../src/data/ascension.ts'
import { createRun, type RunState } from '../../src/engine/index.ts'
import {
  bankRun,
  buy,
  newProfile,
  runContentFor,
  runDeckFor,
  type Profile,
} from '../../src/meta/profile.ts'
import { SAVE_VERSION, deserialize } from '../../src/meta/save.ts'

const rich = (): Profile => ({ ...newProfile(), gold: 5000 })
const buyAll = (profile: Profile, id: string, times = 3) => {
  let current = profile
  for (let i = 0; i < times; i++) current = buy(current, { type: 'binding', id })
  return current
}

describe('new bindings', () => {
  it('starting statuses, word slots, boss heal, death gold, rarity, rival and boss hp', () => {
    let profile = rich()
    for (const id of [
      'focused_mind',
      'bramble_spine',
      'living_ink',
      'long_hand',
      'second_wind',
      'salvage',
      'rare_ink',
      'dulled_rivals',
      'cracked_crown',
    ]) {
      profile = buyAll(profile, id)
    }
    const content = runContentFor(profile)
    expect(content.player.startingStatuses).toEqual({ focus: 4, thorns: 2, regen: 4 })
    expect(content.player.maxWords).toBe(RUN_CONTENT.player.maxWords + 1)
    expect(content.economy.healBeforeBoss).toBe(15)
    expect(content.economy.deathGoldShare).toBeCloseTo(RUN_CONTENT.economy.deathGoldShare + 0.3)
    expect(content.economy.rarityWeights.rare).toBe(RUN_CONTENT.economy.rarityWeights.rare + 2)
    expect(content.economy.rivalHpScale[0]).toBeCloseTo(
      (RUN_CONTENT.economy.rivalHpScale[0] ?? 1) * 0.9,
    )
    expect(content.economy.bossHpScale).toBeCloseTo(0.9)
  })

  it('start-word bindings add words to every run deck', () => {
    let profile = buy(rich(), { type: 'binding', id: 'spare_eraser' })
    profile = buy(profile, { type: 'binding', id: 'double_line' })
    expect(runDeckFor(profile, 'apprentice')).toEqual([
      ...getLoadout('apprentice').deck,
      'erase',
      'twice',
    ])
  })
})

describe('ascension', () => {
  it('each level stacks a harder rule and pays more gold', () => {
    const base = runContentFor(newProfile(), 0)
    const a5 = runContentFor(newProfile(), 5)
    expect(a5.economy.rivalHpScale[2]).toBeCloseTo((base.economy.rivalHpScale[2] ?? 1) * 1.15)
    expect(a5.economy.healAfterWin).toBeCloseTo(base.economy.healAfterWin - 0.15)
    expect(a5.economy.bossHpScale).toBeCloseTo(1.3)
    expect(a5.economy.rewardChoices).toBe(base.economy.rewardChoices - 1)
    expect(a5.enemies.ash_adept?.startingWard).toBe(6)
    expect(a5.economy.goldMultiplier).toBeCloseTo(1.5)
    expect(runContentFor(newProfile(), 1).enemies.ash_adept?.startingWard).toBeUndefined()
  })

  it('winning at your highest level unlocks the next, up to the max', () => {
    const won: RunState = { ...createRun(RUN_CONTENT, [], 1), phase: 'won', gold: 10 }
    let profile = bankRun(newProfile(), won, 0)
    expect(profile.ascensionUnlocked).toBe(1)
    profile = bankRun(profile, won, 0)
    expect(profile.ascensionUnlocked).toBe(1)
    profile = bankRun({ ...profile, ascensionUnlocked: MAX_ASCENSION }, won, MAX_ASCENSION)
    expect(profile.ascensionUnlocked).toBe(MAX_ASCENSION)
    const lost: RunState = { ...won, phase: 'lost' }
    expect(bankRun(newProfile(), lost, 0).ascensionUnlocked).toBe(0)
  })
})

describe('save v2', () => {
  it('migrates a v1 save: ascension 0, and a saved run gets ascension 0', () => {
    const run = createRun(RUN_CONTENT, ['strike'], 2)
    const v1 = {
      version: 1,
      profile: {
        ...newProfile(),
        gold: 77,
        ascensionUnlocked: undefined,
        selectedAscension: undefined,
        currentRun: { loadoutId: 'apprentice', run },
      },
    }
    const profile = deserialize(v1)
    expect(SAVE_VERSION).toBe(2)
    expect(profile.gold).toBe(77)
    expect(profile.ascensionUnlocked).toBe(0)
    expect(profile.selectedAscension).toBe(0)
    expect(profile.currentRun).toEqual({ loadoutId: 'apprentice', ascension: 0, run })
  })

  it('clamps out-of-range ascension values', () => {
    const profile = deserialize({
      version: 2,
      profile: { ...newProfile(), ascensionUnlocked: 99, selectedAscension: 42 },
    })
    expect(profile.ascensionUnlocked).toBe(MAX_ASCENSION)
    expect(profile.selectedAscension).toBe(MAX_ASCENSION)
  })
})
