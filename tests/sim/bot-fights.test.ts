// The bot plays 1,000 seeded duels without crashing or stalling.

import { describe, expect, it } from 'vitest'
import { ENEMIES, LOADOUTS, RUN_CONTENT, duelContent } from '../../src/data/index.ts'
import { greedyBot, rarestReward, runDuel, runRun } from '../../src/engine/index.ts'

const FIGHTS = 1000

describe('greedy bot, every loadout vs every rival', () => {
  it(`plays ${FIGHTS} seeded duels to a result`, () => {
    const outcomes = { won: 0, lost: 0, timeout: 0 }
    for (let seed = 1; seed <= FIGHTS; seed++) {
      const enemy = ENEMIES[seed % ENEMIES.length]
      const loadout = LOADOUTS[seed % LOADOUTS.length]
      if (!enemy || !loadout) throw new Error('No rivals or loadouts defined')
      const { outcome, state } = runDuel(duelContent(enemy.id, loadout.id), seed, greedyBot)
      outcomes[outcome] += 1
      expect(state.player.hp).toBeGreaterThanOrEqual(0)
      expect(state.enemy.hp).toBeGreaterThanOrEqual(0)
    }
    expect(outcomes.timeout).toBe(0)
    expect(outcomes.won + outcomes.lost).toBe(FIGHTS)
  })
})

describe('greedy bot, full runs', () => {
  it('plays 120 runs (20 per loadout) to a win or a loss', () => {
    for (const [index, loadout] of LOADOUTS.entries()) {
      for (let seed = 1; seed <= 20; seed++) {
        const { run } = runRun(
          RUN_CONTENT,
          loadout.deck,
          seed * 31 + index,
          greedyBot,
          rarestReward,
        )
        expect(['won', 'lost']).toContain(run.phase)
      }
    }
  })
})
