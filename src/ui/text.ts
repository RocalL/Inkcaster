// Player-facing wording for spells and combat events. Pure (no React), so the sim script uses it too.

import type { CombatContent, CombatEvent, Effect } from '../engine/index.ts'

export function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'damage':
      return effect.target === 'self'
        ? `Take ${effect.amount} damage`
        : `Deal ${effect.amount} damage`
    case 'heal':
      return effect.target === 'enemy' ? `Heal foe ${effect.amount}` : `Heal ${effect.amount}`
    case 'shield':
      return effect.target === 'enemy'
        ? `Foe gains ${effect.amount} shield`
        : `Gain ${effect.amount} shield`
    case 'draw':
      return effect.count === 1 ? 'Draw a page' : `Draw ${effect.count} pages`
  }
}

export function describeEffects(effects: readonly Effect[]): string {
  return effects.map(describeEffect).join('. ')
}

/** Compact form for timeline markers, e.g. "18 dmg", "ward 7". */
export function summarizeEffects(effects: readonly Effect[]): string {
  return effects
    .map((effect) => {
      switch (effect.kind) {
        case 'damage':
          return `${effect.amount} dmg`
        case 'heal':
          return `+${effect.amount} hp`
        case 'shield':
          return `ward ${effect.amount}`
        case 'draw':
          return `draw ${effect.count}`
      }
    })
    .join(', ')
}

export function spellName(content: CombatContent, spellId: string): string {
  return (
    content.spells[spellId]?.name ??
    content.enemy.spells.find((spell) => spell.id === spellId)?.name ??
    spellId
  )
}

/** One log line. Sides are named from the player's point of view. */
export function describeEvent(event: CombatEvent, content: CombatContent): string | null {
  const who = (side: 'player' | 'enemy') => (side === 'player' ? 'You' : content.enemy.name)
  switch (event.type) {
    case 'spellCast':
      return `${who(event.side)} cast ${spellName(content, event.spellId)}`
    case 'enemyCastStart':
      return `${content.enemy.name} begins ${spellName(content, event.spellId)}`
    case 'damage':
      return `${who(event.target)} took ${event.amount}${event.absorbed ? ` (${event.absorbed} blocked)` : ''}`
    case 'heal':
      return `${who(event.target)} healed ${event.amount}`
    case 'shield':
      return `${who(event.target)} gained ${event.amount} shield`
    case 'wait':
      return 'You gather ink'
    case 'cardDrawn':
      return `Drew ${spellName(content, event.spellId)}`
    case 'reshuffle':
      return `Grimoire reshuffled (${event.cards} pages)`
    case 'commandRejected':
      return null
    case 'death':
      return event.side === 'enemy' ? `${content.enemy.name} is defeated` : 'You are defeated'
  }
}

export function formatSeconds(ticks: number, ticksPerSecond: number): string {
  return (ticks / ticksPerSecond).toFixed(1)
}
