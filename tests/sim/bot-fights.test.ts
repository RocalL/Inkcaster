// The bot plays 1,000 seeded duels without crashing or stalling.

import { describe, expect, it } from 'vitest'
import { ENEMIES, starterDuel } from '../../src/data/index.ts'
import { greedyBot, runDuel } from '../../src/engine/index.ts'

const FIGHTS = 1000

describe('greedy bot vs starter rivals', () => {
  it(`plays ${FIGHTS} seeded duels to a result`, () => {
    const outcomes = { won: 0, lost: 0, timeout: 0 }
    for (let seed = 1; seed <= FIGHTS; seed++) {
      const enemy = ENEMIES[seed % ENEMIES.length]
      if (!enemy) throw new Error('No rivals defined')
      const { outcome, state } = runDuel(starterDuel(enemy.id), seed, greedyBot)
      outcomes[outcome] += 1
      expect(state.player.hp).toBeGreaterThanOrEqual(0)
      expect(state.enemy.hp).toBeGreaterThanOrEqual(0)
    }
    expect(outcomes.timeout).toBe(0)
    expect(outcomes.won + outcomes.lost).toBe(FIGHTS)
  })
})
