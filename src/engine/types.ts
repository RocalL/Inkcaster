// Content definitions: the shapes that /data fills in. The engine never imports /data;
// content is passed in through DuelContent.

export type Side = 'player' | 'enemy'

/** Who an effect hits, relative to the caster: 'enemy' is the caster's opponent. */
export type EffectTarget = 'self' | 'enemy'

export type StatusId = 'burn' | 'chill'

export type Effect =
  | { kind: 'damage'; amount: number; target?: EffectTarget } // default: enemy
  | { kind: 'heal'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'shield'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'applyStatus'; status: StatusId; stacks: number; target?: EffectTarget } // default: enemy
  | { kind: 'draw'; count: number } // player only

export type EffectKind = Effect['kind']

export type Modifier =
  /** The whole spell is cast this many times. */
  | { type: 'repeat'; times: number }
  /** Adds to every damage, shield and heal number of the verb. */
  | { type: 'amplify'; amount: number }

export type EditKind = 'erase'

interface WordBase {
  id: string
  name: string
}

/**
 * A word page. A spell is written from exactly one verb plus a few other words:
 * - verb: what the spell does
 * - modifier: reshapes the verb's numbers or repeats the spell
 * - ink: an element that adds its own effects
 * - edit: changes the rival's next sentence instead of adding effects
 */
export type WordDef =
  | (WordBase & { kind: 'verb'; effects: readonly Effect[] })
  | (WordBase & { kind: 'modifier'; modifier: Modifier })
  | (WordBase & { kind: 'ink'; element: string; effects: readonly Effect[] })
  | (WordBase & { kind: 'edit'; edit: EditKind })

export type WordKind = WordDef['kind']

export interface EnemySpellDef {
  /** Word ids, written by the rival exactly like the player's spells. */
  words: readonly string[]
  /** Relative pick chance for the 'weighted' behaviour. Defaults to 1. */
  weight?: number
}

/** 'rotation' casts spells in list order; 'weighted' picks with the seeded RNG. */
export type EnemyBehaviour = 'rotation' | 'weighted'

export interface EnemyDef {
  id: string
  name: string
  maxHp: number
  behaviour: EnemyBehaviour
  spells: readonly EnemySpellDef[]
}

export interface PlayerSetup {
  maxHp: number
  /** The hand is refilled to this size after each of your turns. */
  handSize: number
  /** Most words in one spell, verb included. */
  maxWords: number
  /** Word ids; duplicates allowed. */
  deck: readonly string[]
}

export interface DuelContent {
  words: Readonly<Record<string, WordDef>>
  player: PlayerSetup
  enemy: EnemyDef
}
