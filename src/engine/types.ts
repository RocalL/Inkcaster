// Content definitions: the shapes that /data fills in. The engine never imports /data;
// content is passed in through DuelContent.

export type Side = 'player' | 'enemy'

/** Who an effect hits, relative to the caster: 'enemy' is the caster's opponent. */
export type EffectTarget = 'self' | 'enemy'

/**
 * burn: damage at the start of its turn (through wards), then halves (rounded down).
 * chill: each hit of its next spell deals that much less, then clears.
 * focus: its next spell gets +N to the verb's numbers, then clears.
 * thorns: whenever it is hit, the attacker takes N; -1 at the start of its turn.
 * regen: heals N at the start of its turn, then -1.
 */
export type StatusId = 'burn' | 'chill' | 'focus' | 'thorns' | 'regen'

/** What a scaling damage effect counts, from the caster's point of view. */
export type ScaleSource = 'targetBurn' | 'targetChill' | 'ownWard' | 'spellWords'

export interface Scaling {
  per: ScaleSource
  /** Extra damage per counted point. */
  each: number
  /** Removes the counted status from the target (e.g. Shatter uses up Chill). */
  consume?: boolean
}

export interface MinionDef {
  name: string
  /** Damage dealt at the end of its owner's turn. */
  attack: number
  /** Turns it stays before fading. */
  turns: number
}

export type Effect =
  | { kind: 'damage'; amount: number; target?: EffectTarget; scaling?: Scaling } // default: enemy
  | { kind: 'heal'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'shield'; amount: number; target?: EffectTarget } // default: self
  | { kind: 'applyStatus'; status: StatusId; stacks: number; target?: EffectTarget } // default: enemy
  | { kind: 'draw'; count: number } // player only
  | { kind: 'summon'; minion: MinionDef } // joins the caster's side
  | { kind: 'rally'; bonus: number } // the caster's minions strike now, each +bonus
  | { kind: 'counter' } // player only: the rival's next spell is cancelled

export type EffectKind = Effect['kind']

export type Modifier =
  /** The whole spell is cast this many times. */
  | { type: 'repeat'; times: number }
  /** Adds to the verb's numbers: damage, ward, heal, status stacks, rally bonus. */
  | { type: 'amplify'; amount: number }
  /** The spell is cast again at the start of the caster's next turn. */
  | { type: 'echo' }
  /** The sentence may hold this many more words. */
  | { type: 'expand'; words: number }

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
  /** HP at the start of the duel (runs carry damage over). Defaults to maxHp. */
  startingHp?: number
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
