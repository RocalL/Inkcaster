// A run: a linear chain of duels ending with a boss. Pure and deterministic like the duel;
// the state is plain data so it can be saved between duels (Phase 5).

import { createDuel, runDuel, type PlayerPolicy } from './duel.ts'
import { nextRandom, randomInt, seedRng, type RngState } from './rng.ts'
import type { DuelState } from './state.ts'
import type { DuelContent, EnemyDef, PlayerSetup, WordDef } from './types.ts'

export type Rarity = 'common' | 'uncommon' | 'rare'

export interface RewardDef {
  wordId: string
  rarity: Rarity
}

export interface RunEconomy {
  /** Gold for winning the duel on floor `i` (0-based): base + perFloor * i. */
  goldBase: number
  goldPerFloor: number
  bossGold: number
  /** Multiplies all gold earned (a Binding). Defaults to 1. */
  goldMultiplier?: number
  /** Share of the gold earned that is kept when you die. */
  deathGoldShare: number
  /** Share of max HP healed after each won duel. */
  healAfterWin: number
  /** Rival max HP multiplier per regular floor (index = floor), so the run ramps up. */
  rivalHpScale: readonly number[]
  /** Boss max HP multiplier. Defaults to 1. */
  bossHpScale?: number
  /** HP healed when stepping onto the boss floor. Defaults to 0. */
  healBeforeBoss?: number
  rewardChoices: number
  rarityWeights: Record<Rarity, number>
}

export interface RunContent {
  words: Readonly<Record<string, WordDef>>
  enemies: Readonly<Record<string, EnemyDef>>
  player: Omit<PlayerSetup, 'deck' | 'startingHp'>
  /** Candidate rival ids for each regular floor, in order. */
  floors: readonly (readonly string[])[]
  /** One of these is drawn as the run's boss. */
  bossIds: readonly string[]
  rewardPool: readonly RewardDef[]
  economy: RunEconomy
}

export type RunPhase = 'map' | 'duel' | 'reward' | 'won' | 'lost'

export interface RunState {
  rng: RngState
  phase: RunPhase
  /** Rival id per floor, boss last. Chosen when the run starts. */
  path: string[]
  /** Index into `path` of the current or next duel. */
  floor: number
  hp: number
  maxHp: number
  deck: string[]
  gold: number
  /** Seed of the current duel (set when entering it). */
  duelSeed: number | null
  /** Words offered after the last win (phase 'reward'). */
  rewardOptions: string[]
  /** Summary of the last duel, for the reward / end screens. */
  lastDuel: { goldEarned: number; healed: number; rounds: number } | null
}

export function createRun(content: RunContent, deck: readonly string[], seed: number): RunState {
  let rng = seedRng(seed)
  const path: string[] = []
  for (const candidates of content.floors) {
    // Prefer rivals not met yet; otherwise at least avoid the same rival twice in a row.
    const unseen = candidates.filter((id) => !path.includes(id))
    const notLast = candidates.filter((id) => id !== path.at(-1))
    const pool = unseen.length > 0 ? unseen : notLast.length > 0 ? notLast : candidates
    const [index, next] = randomInt(rng, pool.length)
    rng = next
    path.push(pool[index] ?? candidates[0] ?? '')
  }
  const [bossIndex, next] = randomInt(rng, content.bossIds.length)
  rng = next
  path.push(content.bossIds[bossIndex] ?? content.bossIds[0] ?? '')
  for (const id of path) getRunEnemy(content, id)

  return {
    rng,
    phase: 'map',
    path,
    floor: 0,
    hp: content.player.maxHp,
    maxHp: content.player.maxHp,
    deck: [...deck],
    gold: 0,
    duelSeed: null,
    rewardOptions: [],
    lastDuel: null,
  }
}

export function isBossFloor(run: RunState): boolean {
  return run.floor === run.path.length - 1
}

/** The duel for the current floor: the run's deck and HP against a floor-scaled rival. */
export function floorDuelContent(content: RunContent, run: RunState): DuelContent {
  const base = getRunEnemy(content, run.path[run.floor] ?? '')
  const scale = isBossFloor(run)
    ? (content.economy.bossHpScale ?? 1)
    : (content.economy.rivalHpScale[run.floor] ?? 1)
  const enemy = { ...base, maxHp: Math.max(1, Math.round(base.maxHp * scale)) }
  return {
    words: content.words,
    player: { ...content.player, maxHp: run.maxHp, startingHp: run.hp, deck: run.deck },
    enemy,
  }
}

/** Map -> duel: fixes the duel seed. The duel itself is played with createDuel/act. */
export function enterDuel(run: RunState): RunState {
  if (run.phase !== 'map') return run
  const [roll, rng] = nextRandom(run.rng)
  return { ...run, rng, phase: 'duel', duelSeed: Math.floor(roll * 2 ** 31) }
}

export function startFloorDuel(content: RunContent, run: RunState): DuelState {
  return createDuel(floorDuelContent(content, run), run.duelSeed ?? 0)
}

/** Duel -> reward / won / lost, from the finished duel's state. */
export function finishDuel(content: RunContent, run: RunState, duel: DuelState): RunState {
  if (run.phase !== 'duel' || duel.status === 'ongoing') return run
  const { economy } = content

  if (duel.status === 'lost') {
    return {
      ...run,
      phase: 'lost',
      hp: 0,
      gold: Math.floor(run.gold * economy.deathGoldShare),
      lastDuel: { goldEarned: 0, healed: 0, rounds: duel.round },
    }
  }

  const boss = isBossFloor(run)
  const baseGold = boss ? economy.bossGold : economy.goldBase + economy.goldPerFloor * run.floor
  const goldEarned = Math.round(baseGold * (economy.goldMultiplier ?? 1))
  const hpAfter = duel.player.hp
  const healed = boss
    ? 0
    : Math.min(run.maxHp - hpAfter, Math.round(run.maxHp * economy.healAfterWin))
  const lastDuel = { goldEarned, healed, rounds: duel.round }
  const gold = run.gold + goldEarned
  if (boss) return { ...run, phase: 'won', hp: hpAfter, gold, lastDuel }

  const [rewardOptions, rng] = rollRewards(content, run.rng)
  return { ...run, rng, phase: 'reward', hp: hpAfter + healed, gold, rewardOptions, lastDuel }
}

/** Reward -> map: adds the chosen word (or nothing) and moves to the next floor. */
export function chooseReward(
  run: RunState,
  wordId: string | null,
  economy?: Pick<RunEconomy, 'healBeforeBoss'>,
): RunState {
  if (run.phase !== 'reward') return run
  if (wordId !== null && !run.rewardOptions.includes(wordId)) return run
  const floor = run.floor + 1
  const toBoss = floor === run.path.length - 1
  const heal = toBoss ? (economy?.healBeforeBoss ?? 0) : 0
  return {
    ...run,
    phase: 'map',
    deck: wordId === null ? run.deck : [...run.deck, wordId],
    floor,
    hp: Math.min(run.maxHp, run.hp + heal),
    rewardOptions: [],
    duelSeed: null,
  }
}

/** Distinct words, each picked by rarity weight. */
function rollRewards(content: RunContent, rng: RngState): [string[], RngState] {
  const { rewardPool, economy } = content
  const picked: string[] = []
  let state = rng
  while (picked.length < economy.rewardChoices) {
    const available = rewardPool.filter((reward) => !picked.includes(reward.wordId))
    if (available.length === 0) break
    const total = available.reduce((sum, reward) => sum + economy.rarityWeights[reward.rarity], 0)
    const [roll, next] = nextRandom(state)
    state = next
    let remaining = roll * total
    const choice =
      available.find((reward) => (remaining -= economy.rarityWeights[reward.rarity]) < 0) ??
      available[available.length - 1]
    if (choice) picked.push(choice.wordId)
  }
  return [picked, state]
}

function getRunEnemy(content: RunContent, id: string): EnemyDef {
  const enemy = content.enemies[id]
  if (!enemy) throw new Error(`Unknown enemy id: ${id}`)
  return enemy
}

// --- Headless harness -------------------------------------------------------

/** Picks a reward (or null to skip). Must be deterministic. */
export type RewardPolicy = (run: RunState, content: RunContent) => string | null

export interface RunResult {
  run: RunState
  /** Floors cleared (the boss counts). */
  floorsCleared: number
}

/** Plays a whole run without rendering: duels with `policy`, rewards with `rewardPolicy`. */
export function runRun(
  content: RunContent,
  deck: readonly string[],
  seed: number,
  policy: PlayerPolicy,
  rewardPolicy: RewardPolicy,
): RunResult {
  let run = createRun(content, deck, seed)
  while (run.phase === 'map') {
    run = enterDuel(run)
    const duel = runDuel(floorDuelContent(content, run), run.duelSeed ?? 0, policy)
    if (duel.outcome === 'timeout') throw new Error(`Duel timed out on floor ${run.floor}`)
    run = finishDuel(content, run, duel.state)
    if (run.phase === 'reward') run = chooseReward(run, rewardPolicy(run, content), content.economy)
  }
  const floorsCleared = run.phase === 'won' ? run.path.length : run.floor
  return { run, floorsCleared }
}

/** Simple reward policy for sims: the first offered word whose rarity is highest. */
export const rarestReward: RewardPolicy = (run, content) => {
  const order: Rarity[] = ['rare', 'uncommon', 'common']
  const rarity = (id: string) =>
    order.indexOf(content.rewardPool.find((reward) => reward.wordId === id)?.rarity ?? 'common')
  return [...run.rewardOptions].sort((a, b) => rarity(a) - rarity(b))[0] ?? null
}
