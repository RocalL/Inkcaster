import { describe, expect, it } from 'vitest'
import {
  chooseReward,
  createRun,
  enterDuel,
  finishDuel,
  floorDuelContent,
  greedyBot,
  isBossFloor,
  rarestReward,
  runRun,
  startFloorDuel,
  type DuelState,
  type RunContent,
  type RunState,
} from '../../src/engine/index.ts'
import { TEST_ENEMY, TEST_PLAYER, TEST_WORDS } from './fixtures.ts'

const content: RunContent = {
  words: TEST_WORDS,
  enemies: {
    dummy: TEST_ENEMY,
    brute: { ...TEST_ENEMY, id: 'brute', name: 'Brute', maxHp: 40 },
    boss: { ...TEST_ENEMY, id: 'boss', name: 'Boss', maxHp: 60 },
  },
  player: { maxHp: 30, handSize: 4, maxWords: 3 },
  floors: [['dummy', 'brute'], ['dummy', 'brute'], ['brute']],
  bossIds: ['boss'],
  rewardPool: [
    { wordId: 'strike', rarity: 'common' },
    { wordId: 'ward', rarity: 'common' },
    { wordId: 'twice', rarity: 'uncommon' },
    { wordId: 'erase', rarity: 'rare' },
  ],
  economy: {
    goldBase: 10,
    goldPerFloor: 5,
    bossGold: 50,
    deathGoldShare: 0.5,
    healAfterWin: 0.3,
    rivalHpScale: [0.5, 1, 1],
    rewardChoices: 3,
    rarityWeights: { common: 6, uncommon: 3, rare: 1 },
  },
}

/** A finished duel as the engine would leave it. */
function finished(run: RunState, status: 'won' | 'lost', playerHp: number): DuelState {
  const duel = startFloorDuel(content, run)
  return { ...duel, status, player: { ...duel.player, hp: playerHp }, round: 5 }
}

describe('createRun', () => {
  it('lays out one rival per floor, then the boss, without back-to-back repeats', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = createRun(content, TEST_PLAYER.deck, seed)
      expect(run.path).toHaveLength(4)
      expect(run.path.at(-1)).toBe('boss')
      expect(run.path[0]).not.toBe(run.path[1])
    }
  })

  it('starts on the map with full hp, the loadout deck and no gold', () => {
    const run = createRun(content, TEST_PLAYER.deck, 1)
    expect(run).toMatchObject({ phase: 'map', floor: 0, hp: 30, maxHp: 30, gold: 0 })
    expect(run.deck).toEqual(TEST_PLAYER.deck)
    expect(createRun(content, TEST_PLAYER.deck, 7)).toEqual(createRun(content, TEST_PLAYER.deck, 7))
  })
})

describe('floor duels', () => {
  it('use the run deck and hp, against a floor-scaled rival', () => {
    const run = { ...createRun(content, ['strike', 'strike', 'ward', 'twice', 'erase'], 1), hp: 17 }
    const duel = floorDuelContent(content, run)
    expect(duel.player).toMatchObject({ maxHp: 30, startingHp: 17 })
    expect(duel.player.deck).toEqual(run.deck)
    const base = content.enemies[run.path[0] ?? '']?.maxHp ?? 0
    expect(duel.enemy.maxHp).toBe(Math.round(base * 0.5))
    expect(startFloorDuel(content, enterDuel(run)).player.hp).toBe(17)
  })

  it('entering a duel fixes its seed deterministically', () => {
    const run = createRun(content, TEST_PLAYER.deck, 3)
    const a = enterDuel(run)
    expect(a.phase).toBe('duel')
    expect(a.duelSeed).toEqual(enterDuel(run).duelSeed)
    expect(enterDuel(a)).toBe(a)
  })
})

describe('finishDuel', () => {
  it('a win pays gold, heals 30% and offers distinct rewards', () => {
    let run = enterDuel(createRun(content, TEST_PLAYER.deck, 1))
    run = { ...run, floor: 1 }
    const after = finishDuel(content, run, finished(run, 'won', 12))
    expect(after.phase).toBe('reward')
    expect(after.gold).toBe(15)
    expect(after.hp).toBe(21)
    expect(after.lastDuel).toEqual({ goldEarned: 15, healed: 9, rounds: 5 })
    expect(after.rewardOptions).toHaveLength(3)
    expect(new Set(after.rewardOptions).size).toBe(3)
  })

  it('healing never goes above max hp', () => {
    const run = enterDuel(createRun(content, TEST_PLAYER.deck, 1))
    const after = finishDuel(content, run, finished(run, 'won', 28))
    expect(after.hp).toBe(30)
    expect(after.lastDuel?.healed).toBe(2)
  })

  it('a loss ends the run and keeps half the gold', () => {
    const run = { ...enterDuel(createRun(content, TEST_PLAYER.deck, 1)), gold: 41 }
    const after = finishDuel(content, run, finished(run, 'lost', 0))
    expect(after).toMatchObject({ phase: 'lost', hp: 0, gold: 20 })
  })

  it('beating the boss wins the run with the boss gold', () => {
    const start = createRun(content, TEST_PLAYER.deck, 1)
    const run = enterDuel({ ...start, floor: start.path.length - 1, gold: 30 })
    expect(isBossFloor(run)).toBe(true)
    const after = finishDuel(content, run, finished(run, 'won', 9))
    expect(after).toMatchObject({ phase: 'won', gold: 80, hp: 9 })
  })

  it('ignores unfinished duels and wrong phases', () => {
    const run = createRun(content, TEST_PLAYER.deck, 1)
    expect(finishDuel(content, run, finished(enterDuel(run), 'won', 10))).toBe(run)
    const inDuel = enterDuel(run)
    expect(finishDuel(content, inDuel, startFloorDuel(content, inDuel))).toBe(inDuel)
  })
})

describe('chooseReward', () => {
  const rewarded = () => {
    const run = enterDuel(createRun(content, TEST_PLAYER.deck, 1))
    return finishDuel(content, run, finished(run, 'won', 20))
  }

  it('adds the chosen word and moves to the next floor', () => {
    const run = rewarded()
    const pick = run.rewardOptions[1] ?? ''
    const after = chooseReward(run, pick)
    expect(after).toMatchObject({ phase: 'map', floor: 1, rewardOptions: [] })
    expect(after.deck).toEqual([...run.deck, pick])
  })

  it('can skip, but not pick a word that was not offered', () => {
    const run = rewarded()
    expect(chooseReward(run, null).deck).toEqual(run.deck)
    const notOffered = ['strike', 'ward', 'twice', 'erase'].find(
      (id) => !run.rewardOptions.includes(id),
    )
    expect(chooseReward(run, notOffered ?? 'nope')).toBe(run)
  })
})

describe('runRun', () => {
  it('plays whole runs to a win or a loss, deterministically', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const result = runRun(content, TEST_PLAYER.deck, seed, greedyBot, rarestReward)
      expect(['won', 'lost']).toContain(result.run.phase)
      expect(result.floorsCleared).toBeLessThanOrEqual(4)
    }
    expect(runRun(content, TEST_PLAYER.deck, 4, greedyBot, rarestReward)).toEqual(
      runRun(content, TEST_PLAYER.deck, 4, greedyBot, rarestReward),
    )
  })
})
