import type { DuelContent, EnemyDef, PlayerSetup, WordDef } from '../engine/index.ts'
import { ENEMIES } from './enemies.ts'
import { LOADOUTS, type Loadout } from './loadouts.ts'
import { WORDS } from './words.ts'

export { ENEMIES, LOADOUTS, WORDS, type Loadout }

export const WORDS_BY_ID: Readonly<Record<string, WordDef>> = Object.fromEntries(
  WORDS.map((word) => [word.id, word]),
)

/** Player stats shared by every loadout until Bindings (Phase 5). */
export const BASE_PLAYER: Omit<PlayerSetup, 'deck'> = {
  maxHp: 50,
  handSize: 6,
  maxWords: 3,
}

export const DEFAULT_LOADOUT_ID = 'apprentice'

export function getEnemy(id: string): EnemyDef {
  const enemy = ENEMIES.find((candidate) => candidate.id === id)
  if (!enemy) throw new Error(`Unknown enemy id: ${id}`)
  return enemy
}

export function getLoadout(id: string): Loadout {
  const loadout = LOADOUTS.find((candidate) => candidate.id === id)
  if (!loadout) throw new Error(`Unknown loadout id: ${id}`)
  return loadout
}

export function duelContent(enemyId: string, loadoutId = DEFAULT_LOADOUT_ID): DuelContent {
  return {
    words: WORDS_BY_ID,
    player: { ...BASE_PLAYER, deck: getLoadout(loadoutId).deck },
    enemy: getEnemy(enemyId),
  }
}
