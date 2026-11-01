// Player-facing wording for words, spells and duel events. Pure (no React), so the sim
// script uses it too.

import type {
  ComposeResult,
  CombatEvent,
  DamageSource,
  DuelContent,
  Effect,
  ScaleSource,
  StatusId,
  WordDef,
} from '../engine/index.ts'

export const STATUS_NAMES: Record<StatusId, string> = {
  burn: 'Burn',
  chill: 'Chill',
  focus: 'Focus',
  thorns: 'Thorns',
  regen: 'Regen',
}

export const STATUS_RULES: Record<StatusId, string> = {
  burn: 'At the start of its turn, takes damage equal to Burn (through wards), then Burn halves.',
  chill: 'Each hit of its next spell deals that much less damage. Then Chill clears.',
  focus: "Its next spell gets that much more on the verb's numbers. Then Focus clears.",
  thorns: 'Whenever it is hit, the attacker takes that much damage. Drops by 1 each turn.',
  regen: 'Heals that much at the start of its turn, then drops by 1.',
}

const SCALE_TEXT: Record<ScaleSource, string> = {
  targetBurn: 'per Burn on the target',
  targetChill: 'per Chill on the target, using it up',
  ownWard: 'per point of your ward',
  spellWords: 'per word in this spell',
}

export function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'damage': {
      const scaling = effect.scaling
        ? `, +${effect.scaling.each} ${SCALE_TEXT[effect.scaling.per]}`
        : ''
      return effect.target === 'self'
        ? `Take ${effect.amount} damage`
        : `Deal ${effect.amount} damage${scaling}`
    }
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
    case 'summon': {
      const { name, attack, turns } = effect.minion
      return `Summon ${withArticle(name)} (${attack} damage each turn, ${turns} turns)`
    }
    case 'rally':
      return effect.bonus > 0
        ? `Your familiars strike now, +${effect.bonus} each`
        : 'Your familiars strike now'
    case 'counter':
      return "Cancel the rival's next spell"
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
    case 'modifier': {
      const modifier = word.modifier
      switch (modifier.type) {
        case 'repeat':
          return modifier.times === 2
            ? 'Cast the spell twice'
            : `Cast the spell ${modifier.times} times`
        case 'amplify':
          return `+${modifier.amount} to the verb's numbers`
        case 'echo':
          return 'Cast it again at the start of your next turn'
        case 'expand':
          return `This spell may hold ${modifier.words} more words`
      }
    }
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
  const times =
    result.times === 1 ? '' : ` — ${result.times === 2 ? 'twice' : `${result.times} times`}`
  const echo = result.echo ? ', echoes next turn' : ''
  return `${once}${times}${echo}`
}

export function wordName(content: Pick<DuelContent, 'words'>, wordId: string): string {
  return content.words[wordId]?.name ?? wordId
}

/** A word's name with its Rewrite tier, e.g. "Strike II". */
export function wordLabel(content: Pick<DuelContent, 'words'>, wordId: string): string {
  const word = content.words[wordId]
  if (!word) return wordId
  return word.tier ? `${word.name} ${word.tier === 2 ? 'II' : 'III'}` : word.name
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
      const from = event.source ? ` from ${DAMAGE_SOURCES[event.source]}` : ''
      return `${who(event.target)} took ${event.amount}${from}${blocked}`
    }
    case 'heal':
      return `${who(event.target)} healed ${event.amount}${event.source ? ' (Regen)' : ''}`
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
    case 'minionSummoned':
      return `${who(event.side)} summoned ${withArticle(event.name)}`
    case 'minionFaded':
      return `${event.side === 'player' ? 'Your' : `${content.enemy.name}'s`} ${event.name} fades`
    case 'spellCountered':
      return `${content.enemy.name}'s spell is blotted out`
    case 'echo':
      return `${who(event.side)} echo “${sentence(content, event.words)}”`
    case 'death':
      return event.side === 'enemy' ? `${content.enemy.name} is defeated` : 'You are defeated'
  }
}

const DAMAGE_SOURCES: Record<DamageSource, string> = {
  burn: 'Burn',
  thorns: 'Thorns',
  minion: 'a familiar',
}

function withArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`
}
