import type { Side, StatusId } from './types.ts'

// Events emitted by one player action (and the rival turn that follows). The UI, VFX, audio
// and the debug log read them; nothing in the engine depends on them.

export type RejectReason =
  'badWordIndex' | 'needOneVerb' | 'tooManyWords' | 'badEraseTarget' | 'eraseTargetCount'

export type CombatEvent =
  | { type: 'spellWritten'; side: Side; words: string[] }
  | { type: 'wordErased'; wordId: string }
  | { type: 'wordsDiscarded'; count: number }
  | { type: 'intent'; words: string[] }
  | { type: 'damage'; target: Side; amount: number; absorbed: number; source?: StatusId }
  | { type: 'heal'; target: Side; amount: number }
  | { type: 'shield'; target: Side; amount: number }
  | { type: 'statusApplied'; target: Side; status: StatusId; stacks: number }
  | { type: 'wordDrawn'; wordId: string }
  | { type: 'reshuffle'; cards: number }
  | { type: 'commandRejected'; reason: RejectReason }
  | { type: 'death'; side: Side }
