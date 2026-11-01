import type { Side } from './types.ts'

// Events emitted by one simulation step. The UI, VFX, audio and the debug log read them;
// nothing in the engine depends on them yet. Reactive triggers (onHit, onDeath...) arrive in Phase 3.

export type RejectReason = 'noSuchSlot' | 'notEnoughInk' | 'notYourTurn'

export type CombatEvent =
  | { type: 'spellCast'; side: Side; spellId: string; slot?: number }
  | { type: 'enemyCastStart'; spellId: string; castTicks: number }
  | { type: 'wait'; ticks: number }
  | { type: 'damage'; target: Side; amount: number; absorbed: number }
  | { type: 'heal'; target: Side; amount: number }
  | { type: 'shield'; target: Side; amount: number }
  | { type: 'cardDrawn'; slot: number; spellId: string }
  | { type: 'reshuffle'; cards: number }
  | { type: 'commandRejected'; slot?: number; reason: RejectReason }
  | { type: 'death'; side: Side }
