// Headless bot simulation and debug log.
//
//   npm run sim                                     every loadout vs every rival (win % matrix)
//   npm run sim -- --fights 200 --seed 42           custom batch size / first seed
//   npm run sim -- --loadout warden --enemy ash_adept   one pairing, with details
//   npm run sim -- --enemy ash_adept --log          print one duel, round by round
//   npm run sim -- --runs                           full runs per loadout (win %, floors, gold)

import { parseArgs } from 'node:util'
import {
  DEFAULT_LOADOUT_ID,
  ENEMIES,
  LOADOUTS,
  RUN_CONTENT,
  duelContent,
  getLoadout,
} from '../src/data/index.ts'
import { greedyBot, rarestReward, runDuel, runRun, type DuelResult } from '../src/engine/index.ts'
import { describeEvent } from '../src/ui/text.ts'

const { values } = parseArgs({
  options: {
    fights: { type: 'string', default: '300' },
    seed: { type: 'string', default: '1' },
    enemy: { type: 'string' },
    loadout: { type: 'string' },
    log: { type: 'boolean', default: false },
    runs: { type: 'boolean', default: false },
  },
})

const fights = Number(values.fights)
const firstSeed = Number(values.seed)
const enemyIds = values.enemy ? [values.enemy] : ENEMIES.map((enemy) => enemy.id)
const loadoutIds = values.loadout ? [values.loadout] : LOADOUTS.map((loadout) => loadout.id)

if (values.log) {
  const content = duelContent(enemyIds[0] ?? '', values.loadout ?? DEFAULT_LOADOUT_ID)
  const result = runDuel(content, firstSeed, greedyBot, { recordLog: true })
  for (const { round, events } of result.log) {
    console.log(`— Round ${round}`)
    for (const event of events) {
      const text =
        event.type === 'commandRejected'
          ? `rejected: ${event.reason}`
          : describeEvent(event, content)
      if (text) console.log(`   ${text}`)
    }
  }
  console.log(`\n${result.outcome.toUpperCase()} in ${result.state.round} rounds`)
  process.exit(0)
}

if (values.runs) {
  const runs = Number(values.fights === '300' ? '200' : values.fights)
  const floors = RUN_CONTENT.floors.length + 1
  console.log(`${runs} runs per loadout (${floors} floors, boss last)\n`)
  console.log('loadout     win    avg floors  avg gold  avg deck  died on floor (1..boss)')
  let failed = false
  for (const loadoutId of loadoutIds) {
    const deaths = Array.from({ length: floors }, () => 0)
    let wins = 0
    let cleared = 0
    let gold = 0
    let deck = 0
    for (let seed = firstSeed; seed < firstSeed + runs; seed++) {
      try {
        const result = runRun(
          RUN_CONTENT,
          getLoadout(loadoutId).deck,
          seed,
          greedyBot,
          rarestReward,
        )
        if (result.run.phase === 'won') wins += 1
        else deaths[result.run.floor] = (deaths[result.run.floor] ?? 0) + 1
        cleared += result.floorsCleared
        gold += result.run.gold
        deck += result.run.deck.length
      } catch (error) {
        failed = true
        console.error(`seed ${seed}: ${loadoutId} run crashed:`, error)
      }
    }
    console.log(
      [
        loadoutId.padEnd(12),
        `${((wins / runs) * 100).toFixed(0)}%`.padEnd(7),
        (cleared / runs).toFixed(1).padEnd(12),
        (gold / runs).toFixed(0).padEnd(10),
        (deck / runs).toFixed(1).padEnd(10),
        deaths.join(' '),
      ].join(''),
    )
  }
  process.exit(failed ? 1 : 0)
}

interface Tally {
  won: number
  lost: number
  timeout: number
  crashed: number
  rounds: number
  hpLeftOnWin: number
}

function simulate(loadoutId: string, enemyId: string): Tally {
  const content = duelContent(enemyId, loadoutId)
  const tally: Tally = { won: 0, lost: 0, timeout: 0, crashed: 0, rounds: 0, hpLeftOnWin: 0 }
  for (let seed = firstSeed; seed < firstSeed + fights; seed++) {
    let result: DuelResult
    try {
      result = runDuel(content, seed, greedyBot)
    } catch (error) {
      tally.crashed += 1
      console.error(`seed ${seed}: ${loadoutId} vs ${enemyId} crashed:`, error)
      continue
    }
    tally[result.outcome] += 1
    tally.rounds += result.state.round
    if (result.outcome === 'won') tally.hpLeftOnWin += result.state.player.hp
  }
  return tally
}

const winRate = (tally: Tally) => `${((tally.won / fights) * 100).toFixed(0)}%`
const avgRounds = (tally: Tally) => (tally.rounds / Math.max(1, fights - tally.crashed)).toFixed(1)
const avgHp = (tally: Tally) => (tally.hpLeftOnWin / Math.max(1, tally.won)).toFixed(0)

let crashed = false
console.log(`win % / avg rounds / avg hp left on win — ${fights} duels per cell\n`)
console.log(['loadout'.padEnd(12), ...enemyIds.map((id) => id.padEnd(18))].join(''))
for (const loadoutId of loadoutIds) {
  const cells = enemyIds.map((enemyId) => {
    const tally = simulate(loadoutId, enemyId)
    crashed ||= tally.crashed > 0 || tally.timeout > 0
    const timeouts = tally.timeout ? ` T${tally.timeout}` : ''
    return `${winRate(tally)} ${avgRounds(tally)}r ${avgHp(tally)}hp${timeouts}`.padEnd(18)
  })
  console.log([loadoutId.padEnd(12), ...cells].join(''))
}
process.exit(crashed ? 1 : 0)
