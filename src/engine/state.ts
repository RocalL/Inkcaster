import type { CombatEvent } from './events.ts'
import { seedRng, shuffle, type RngState } from './rng.ts'
import type { DuelContent, Side, StatusId, WordDef } from './types.ts'

export interface WordCard {
  /** Unique within a duel; stable key for the UI. */
  uid: number
  wordId: string
}

export type Statuses = Record<StatusId, number>

export interface Minion {
  /** Unique within a duel; stable key for the UI. */
  uid: number
  name: string
  attack: number
  turnsLeft: number
}

export interface Fighter {
  hp: number
  maxHp: number
  /** Absorbs the next hit only; whatever is left after that hit is lost. */
  ward: number
  statuses: Statuses
  /** Familiars on this side; they strike at the end of their owner's turn. */
  minions: Minion[]
  /** Words of a spell with Echo, recast at the start of this fighter's next turn. */
  echo: string[] | null
}

export interface PlayerState extends Fighter {
  hand: WordCard[]
  drawPile: WordCard[]
  discardPile: WordCard[]
}

export interface IntentWord {
  wordId: string
  /** Struck out by the player's Erase: it will not be cast. */
  erased: boolean
}

export interface EnemyState extends Fighter {
  /** The sentence the rival will cast on its next turn, shown to the player. */
  intent: IntentWord[]
  /** Spells cast so far; drives the 'rotation' behaviour. */
  spellsCast: number
  /** Blotted by the player: the next spell is cancelled. */
  countered: boolean
}

export type DuelStatus = 'ongoing' | 'won' | 'lost'

/** Plain, serializable data. Definitions live in DuelContent, not here. */
export interface DuelState {
  round: number
  rng: RngState
  status: DuelStatus
  player: PlayerState
  enemy: EnemyState
  /** Next uid handed to a summoned minion. */
  nextMinionUid: number
}

/** Mutable working set for one action: a private clone of the state plus the events emitted. */
export interface ActionContext {
  content: DuelContent
  state: DuelState
  events: CombatEvent[]
}

export const NO_STATUSES: Statuses = { burn: 0, chill: 0, focus: 0, thorns: 0, regen: 0 }

/** Most minions one side can have at once; extra summons fizzle. */
export const MAX_MINIONS = 4

/**
 * Copies every mutable part of the state, so an action can work on the copy.
 * WordCards are shared: they are moved between piles but never modified.
 * Update this when adding nested state (a frozen-input test guards it).
 */
export function cloneState(state: DuelState): DuelState {
  const { player, enemy } = state
  return {
    ...state,
    player: {
      ...player,
      statuses: { ...player.statuses },
      minions: player.minions.map((minion) => ({ ...minion })),
      echo: player.echo && [...player.echo],
      hand: [...player.hand],
      drawPile: [...player.drawPile],
      discardPile: [...player.discardPile],
    },
    enemy: {
      ...enemy,
      statuses: { ...enemy.statuses },
      minions: enemy.minions.map((minion) => ({ ...minion })),
      echo: enemy.echo && [...enemy.echo],
      intent: enemy.intent.map((word) => ({ ...word })),
    },
  }
}

export function getWord(content: Pick<DuelContent, 'words'>, wordId: string): WordDef {
  const word = content.words[wordId]
  if (!word) throw new Error(`Unknown word id: ${wordId}`)
  return word
}

export function getFighter(state: DuelState, side: Side): Fighter {
  return side === 'player' ? state.player : state.enemy
}

/** Builds the opening state. The rival's first intent is chosen by createDuel in duel.ts. */
export function createInitialState(content: DuelContent, seed: number): DuelState {
  const { player, enemy } = content
  if (enemy.spells.length === 0) throw new Error(`Enemy ${enemy.id} has no spells`)

  const cards = player.deck.map((wordId, uid) => {
    getWord(content, wordId)
    return { uid, wordId }
  })
  const [deck, rng] = shuffle(cards, seedRng(seed))

  return {
    round: 1,
    rng,
    status: 'ongoing',
    player: {
      hp: Math.min(player.startingHp ?? player.maxHp, player.maxHp),
      maxHp: player.maxHp,
      ward: player.startingWard ?? 0,
      statuses: { ...NO_STATUSES },
      minions: [],
      echo: null,
      hand: deck.slice(0, player.handSize),
      drawPile: deck.slice(player.handSize),
      discardPile: [],
    },
    enemy: {
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      ward: 0,
      statuses: { ...NO_STATUSES },
      minions: [],
      echo: null,
      intent: [],
      spellsCast: 0,
      countered: false,
    },
    nextMinionUid: 0,
  }
}
