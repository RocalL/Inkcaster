// Player-facing wording for words, spells and duel events. Pure (no React), so the sim
// script uses it too.

import type {
  ComposeResult,
  CombatEvent,
  DuelContent,
  Effect,
  StatusId,
  WordDef,
} from '../engine/index.ts'

const STATUS_NAMES: Record<StatusId, string> = { burn: 'Burn', chill: 'Chill' }

export const STATUS_RULES: Record<StatusId, string> = {
  burn: 'At the start of its turn, takes damage equal to Burn (through wards), then Burn drops by 1.',
  chill: 'Each hit of its next spell deals that much less damage. Then Chill clears.',
}

export function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'damage':
      return effect.target === 'self'
        ? `Take ${effect.amount} damage`
        : `Deal ${effect.amount} damage`
    case 'heal':
      return effect.target === 'enemy' ? `Heal foe ${effect.amount}` : `Heal ${effect.amount}`
    case 'shield':
      return effect.target === 'enemy' ? `Foe gains ward ${effect.amount}` : `Ward ${effect.amount}`
    case 'applyStatus': {
      const name = `${STATUS_NAMES[effect.status]} ${effect.stacks}`
      return effect.target === 'self' ? `Gain ${name}` : name
    }
    case 'draw':
      return effect.count === 1 ? 'Draw a word' : `Draw ${effect.count} words`
  }
}

export function describeEffects(effects: readonly Effect[]): string {
  return effects.map(describeEffect).join(', ')
}

/** The rules text printed on a word page. */
export function describeWord(word: WordDef): string {
  switch (word.kind) {
    case 'verb':
    case 'ink':
      return describeEffects(word.effects)
    case 'modifier':
      return word.modifier.type === 'repeat'
        ? word.modifier.times === 2
          ? 'Cast the spell twice'
          : `Cast the spell ${word.modifier.times} times`
        : `+${word.modifier.amount} to the verb's numbers`
    case 'edit':
      return "Strike out a word of the rival's next spell"
  }
}

export const KIND_LABELS: Record<WordDef['kind'], string> = {
  verb: 'verb',
  modifier: 'modifier',
  ink: 'ink',
  edit: 'edit',
}

/** A composed spell in one line, e.g. "Deal 4 damage, Burn 2 — twice". */
export function describeSpell(result: ComposeResult): string {
  if (!result.ok) return 'A spell needs exactly one verb'
  const once = describeEffects(result.once) || 'No effect'
  if (result.times === 1) return once
  return `${once} — ${result.times === 2 ? 'twice' : `${result.times} times`}`
}

export function wordName(content: DuelContent, wordId: string): string {
  return content.words[wordId]?.name ?? wordId
}

export function sentence(content: DuelContent, wordIds: readonly string[]): string {
  return wordIds.map((id) => wordName(content, id)).join(' ')
}

/** One log line. Sides are named from the player's point of view. */
export function describeEvent(event: CombatEvent, content: DuelContent): string | null {
  const who = (side: 'player' | 'enemy') => (side === 'player' ? 'You' : content.enemy.name)
  switch (event.type) {
    case 'spellWritten':
      return `${who(event.side)} cast “${sentence(content, event.words)}”`
    case 'wordErased':
      return `You erase “${wordName(content, event.wordId)}”`
    case 'wordsDiscarded':
      return event.count === 0 ? 'You pass' : `You discard ${event.count} words`
    case 'intent':
      return `${content.enemy.name} prepares “${sentence(content, event.words)}”`
    case 'damage': {
      const blocked = event.absorbed ? ` (${event.absorbed} warded)` : ''
      const burn = event.source === 'burn' ? ' from Burn' : ''
      return `${who(event.target)} took ${event.amount}${burn}${blocked}`
    }
    case 'heal':
      return `${who(event.target)} healed ${event.amount}`
    case 'shield':
      return `${who(event.target)} raised ward ${event.amount}`
    case 'statusApplied':
      return `${who(event.target)}: ${STATUS_NAMES[event.status]} +${event.stacks}`
    case 'wordDrawn':
      return null
    case 'reshuffle':
      return `Deck reshuffled (${event.cards} words)`
    case 'commandRejected':
      return null
    case 'death':
      return event.side === 'enemy' ? `${content.enemy.name} is defeated` : 'You are defeated'
  }
}
