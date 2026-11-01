import type { CombatContent, EnemyDef, PlayerSetup, SpellDef } from '../engine/index.ts'
import { ENEMIES } from './enemies.ts'
import { STARTER_SPELLS } from './spells.ts'

export { ENEMIES, STARTER_SPELLS }

export const SPELLS: Readonly<Record<string, SpellDef>> = Object.fromEntries(
  STARTER_SPELLS.map((spell) => [spell.id, spell]),
)

/** Placeholder until Loadouts (Phase 5): one copy of each starter spell. */
export const STARTER_PLAYER: PlayerSetup = {
  maxHp: 50,
  maxInk: 10,
  startingInk: 3,
  inkPerSecond: 0.8,
  handSize: 5,
  grimoire: STARTER_SPELLS.map((spell) => spell.id),
}

export function getEnemy(id: string): EnemyDef {
  const enemy = ENEMIES.find((candidate) => candidate.id === id)
  if (!enemy) throw new Error(`Unknown enemy id: ${id}`)
  return enemy
}

export function starterDuel(enemyId: string): CombatContent {
  return { spells: SPELLS, player: STARTER_PLAYER, enemy: getEnemy(enemyId) }
}
