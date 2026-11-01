import type { CombatEvent } from './events.ts'
import { seedRng, shuffle, type RngState } from './rng.ts'
import { durationTicks, secondsToTicks } from './time.ts'
import type { CombatContent, Side, SpellDef } from './types.ts'

export interface CardInstance {
  /** Unique within a combat; stable key for the UI. */
  uid: number
  spellId: string
}

export interface HandSlot {
  card: CardInstance | null
  /** Ticks left before an empty slot draws its next page. */
  cooldown: number
}

export interface Combatant {
  hp: number
  maxHp: number
  shield: number
}

export interface PlayerState extends Combatant {
  ink: number
  maxInk: number
  /** Ticks accumulated towards the next point of ink. */
  inkProgress: number
  ticksPerInk: number
  hand: HandSlot[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
}

export interface EnemyCast {
  spellIndex: number
  totalTicks: number
  remainingTicks: number
}

export interface EnemyState extends Combatant {
  /** The telegraphed cast in progress, if any. */
  cast: EnemyCast | null
  /** Ticks left before the next cast starts. */
  idleTicks: number
  /** Number of casts started so far; drives the 'rotation' behaviour. */
  castsStarted: number
}

export type CombatStatus = 'ongoing' | 'won' | 'lost'

/** Plain, serializable data. Definitions live in CombatContent, not here. */
export interface CombatState {
  tick: number
  rng: RngState
  status: CombatStatus
  player: PlayerState
  enemy: EnemyState
}

/** Mutable working set for one step: a private clone of the state plus the events emitted. */
export interface StepContext {
  content: CombatContent
  state: CombatState
  events: CombatEvent[]
}

/**
 * Copies every mutable part of the state, so step() can work on the copy.
 * CardInstances are shared: they are moved between piles but never modified.
 * Update this when adding nested state (a frozen-input test guards it).
 */
export function cloneState(state: CombatState): CombatState {
  const { player, enemy } = state
  return {
    ...state,
    player: {
      ...player,
      hand: player.hand.map((slot) => ({ ...slot })),
      drawPile: [...player.drawPile],
      discardPile: [...player.discardPile],
    },
    enemy: { ...enemy, cast: enemy.cast && { ...enemy.cast } },
  }
}

export function getSpell(content: CombatContent, spellId: string): SpellDef {
  const spell = content.spells[spellId]
  if (!spell) throw new Error(`Unknown spell id: ${spellId}`)
  return spell
}

export function getCombatant(state: CombatState, side: Side): Combatant {
  return side === 'player' ? state.player : state.enemy
}

export function createCombat(content: CombatContent, seed: number): CombatState {
  const { player, enemy } = content
  if (enemy.spells.length === 0) throw new Error(`Enemy ${enemy.id} has no spells`)

  const cards = player.grimoire.map((spellId, uid) => {
    getSpell(content, spellId)
    return { uid, spellId }
  })
  const [deck, rng] = shuffle(cards, seedRng(seed))
  const hand: HandSlot[] = Array.from({ length: player.handSize }, (_, i) => ({
    card: deck[i] ?? null,
    cooldown: 0,
  }))

  return {
    tick: 0,
    rng,
    status: 'ongoing',
    player: {
      hp: player.maxHp,
      maxHp: player.maxHp,
      shield: 0,
      ink: Math.min(player.startingInk, player.maxInk),
      maxInk: player.maxInk,
      inkProgress: 0,
      ticksPerInk: durationTicks(1 / player.inkPerSecond),
      hand,
      drawPile: deck.slice(player.handSize),
      discardPile: [],
    },
    enemy: {
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      shield: 0,
      cast: null,
      idleTicks: secondsToTicks(enemy.openingDelay ?? enemy.castGap),
      castsStarted: 0,
    },
  }
}
