// Content definitions: the shapes that /data fills in. The engine never imports /data;
// content is passed in through CombatContent.

export type Side = 'player' | 'enemy'

/** Who an effect hits, relative to the caster: 'enemy' is the caster's opponent. */
export type EffectTarget = 'self' | 'enemy'

export type Effect =
  | { kind: 'damage'; amount: number; target?: EffectTarget } // default: enemy
  | { kind: 'heal'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'shield'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'draw'; count: number } // player only: adds pages to the hand, up to MAX_HAND_SIZE

export type EffectKind = Effect['kind']

export type SpellType = 'direct' | 'enchantment' | 'minion' | 'ward' | 'counter' | 'utility'

export interface SpellDef {
  id: string
  name: string
  type: SpellType
  /** Ink cost. */
  cost: number
  /** Timeline cost: seconds that pass before the caster's next turn. */
  time: number
  tags: readonly string[]
  effects: readonly Effect[]
}

export interface EnemySpellDef {
  id: string
  name: string
  /** Seconds of telegraphed cast bar before the effects resolve. */
  castTime: number
  /** Relative pick chance for the 'weighted' behaviour. Defaults to 1. */
  weight?: number
  effects: readonly Effect[]
}

/** 'rotation' casts spells in list order; 'weighted' picks with the seeded RNG. */
export type EnemyBehaviour = 'rotation' | 'weighted'

export interface EnemyDef {
  id: string
  name: string
  maxHp: number
  behaviour: EnemyBehaviour
  /** Seconds of idle between the end of one cast and the start of the next. */
  castGap: number
  /** Seconds before the first cast. Defaults to castGap. */
  openingDelay?: number
  spells: readonly EnemySpellDef[]
}

export interface PlayerSetup {
  maxHp: number
  maxInk: number
  startingInk: number
  /** Ink regenerated per second. */
  inkPerSecond: number
  /** Pages in hand at the start; casting refills back up to this. */
  handSize: number
  /** Spell ids; duplicates allowed. */
  grimoire: readonly string[]
}

export interface CombatContent {
  spells: Readonly<Record<string, SpellDef>>
  player: PlayerSetup
  enemy: EnemyDef
}
