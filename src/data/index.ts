import type { DuelContent, EnemyDef, PlayerSetup, WordDef } from '../engine/index.ts'
import { ENEMIES } from './enemies.ts'
import { WORDS } from './words.ts'

export { ENEMIES, WORDS }

export const WORDS_BY_ID: Readonly<Record<string, WordDef>> = Object.fromEntries(
  WORDS.map((word) => [word.id, word]),
)

/** Placeholder until Loadouts (Phase 5). */
export const STARTER_PLAYER: PlayerSetup = {
  maxHp: 50,
  handSize: 6,
  maxWords: 3,
  deck: [
    'strike',
    'strike',
    'strike',
    'ward',
    'ward',
    'mend',
    'drain',
    'twice',
    'twice',
    'greater',
    'greater',
    'fire',
    'ice',
    'arcane',
    'erase',
  ],
}

export function getEnemy(id: string): EnemyDef {
  const enemy = ENEMIES.find((candidate) => candidate.id === id)
  if (!enemy) throw new Error(`Unknown enemy id: ${id}`)
  return enemy
}

export function starterDuel(enemyId: string): DuelContent {
  return { words: WORDS_BY_ID, player: STARTER_PLAYER, enemy: getEnemy(enemyId) }
}
