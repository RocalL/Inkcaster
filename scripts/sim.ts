// Headless bot simulation and debug log.
//
//   npm run sim                              1,000 fights against every enemy
//   npm run sim -- --fights 200 --seed 42    custom batch
//   npm run sim -- --enemy ash_adept --log   print one duel's event log

import { parseArgs } from 'node:util'
import { ENEMIES, starterDuel } from '../src/data/index.ts'
import {
  TICKS_PER_SECOND,
  greedyBot,
  runDuel,
  type CombatContent,
  type CombatEvent,
  type DuelResult,
} from '../src/engine/index.ts'
import { describeEvent } from '../src/ui/text.ts'

const { values } = parseArgs({
  options: {
    fights: { type: 'string', default: '1000' },
    seed: { type: 'string', default: '1' },
    enemy: { type: 'string' },
    log: { type: 'boolean', default: false },
  },
})

const fights = Number(values.fights)
const firstSeed = Number(values.seed)
const enemyIds = values.enemy ? [values.enemy] : ENEMIES.map((enemy) => enemy.id)

if (values.log) {
  const content = starterDuel(enemyIds[0] ?? '')
  const result = runDuel(content, firstSeed, greedyBot, { recordLog: true })
  for (const { tick, event } of result.log) {
    console.log(`${seconds(tick).padStart(6)}s  ${describe(event, content)}`)
  }
  console.log(`\n${result.outcome.toUpperCase()} after ${seconds(result.state.tick)}s`)
  process.exit(0)
}

let crashed = false
for (const enemyId of enemyIds) {
  const content = starterDuel(enemyId)
  const tally = { won: 0, lost: 0, timeout: 0, crashed: 0 }
  let totalTicks = 0
  let hpLeftOnWin = 0

  for (let seed = firstSeed; seed < firstSeed + fights; seed++) {
    let result: DuelResult
    try {
      result = runDuel(content, seed, greedyBot)
    } catch (error) {
      tally.crashed += 1
      console.error(`seed ${seed} vs ${enemyId} crashed:`, error)
      continue
    }
    tally[result.outcome] += 1
    totalTicks += result.state.tick
    if (result.outcome === 'won') hpLeftOnWin += result.state.player.hp
  }

  crashed ||= tally.crashed > 0
  const played = fights - tally.crashed
  console.log(
    [
      enemyId.padEnd(14),
      `win ${percent(tally.won, fights)}`,
      `lost ${tally.lost}`,
      `timeout ${tally.timeout}`,
      `crashed ${tally.crashed}`,
      `avg ${seconds(totalTicks / Math.max(1, played))}s`,
      `avg hp left on win ${(hpLeftOnWin / Math.max(1, tally.won)).toFixed(1)}`,
    ].join('  |  '),
  )
}
process.exit(crashed ? 1 : 0)

function seconds(ticks: number): string {
  return (ticks / TICKS_PER_SECOND).toFixed(2)
}

function percent(part: number, total: number): string {
  return `${((part / total) * 100).toFixed(1)}%`.padStart(6)
}

function describe(event: CombatEvent, content: CombatContent): string {
  if (event.type === 'commandRejected') return `  slot ${event.slot} rejected: ${event.reason}`
  return describeEvent(event, content) ?? event.type
}
