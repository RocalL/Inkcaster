// Turns duel events into sound and ink splashes. Purely presentational: nothing here affects
// the game, and it does nothing when the page or the layers are not available (tests).

import { playSound } from '../../audio/sfx.ts'
import type { CombatEvent, Side } from '../../engine/index.ts'
import { splashAt } from '../../vfx/ink-layer.ts'

/** Ink colours, matching the CSS tokens. */
const INK = {
  hit: '#8c2f2a',
  burn: '#b3261e',
  ward: '#3a6fa8',
  heal: '#2f7a3a',
  chill: '#1f5fa8',
  arcane: '#6b3fa0',
  ink: '#1e1b4b',
}

function fighterElement(side: Side): Element | null {
  return globalThis.document?.querySelector(`[data-fighter="${side}"] .health-bar`) ?? null
}

export function playFeedback(events: readonly CombatEvent[]): void {
  if (!globalThis.document) return
  for (const event of events) {
    switch (event.type) {
      case 'spellWritten':
      case 'echo':
        playSound('cast')
        break
      case 'damage':
        if (event.amount > 0) {
          playSound(event.source === 'burn' ? 'burn' : 'hit')
          const color = event.source === 'burn' ? INK.burn : INK.hit
          splashAt(fighterElement(event.target), color, 10 + Math.min(event.amount, 20), 1)
        } else if (event.absorbed > 0) {
          playSound('ward')
          splashAt(fighterElement(event.target), INK.ward, 8, 0.7)
        }
        break
      case 'shield':
        playSound('ward')
        break
      case 'heal':
        if (event.amount > 0) {
          playSound('heal')
          splashAt(fighterElement(event.target), INK.heal, 8, 0.6)
        }
        break
      case 'statusApplied':
        if (event.status === 'burn') playSound('burn')
        else if (event.status === 'chill') playSound('chill')
        break
      case 'wordErased':
      case 'spellCountered':
        playSound('erase')
        break
      case 'minionSummoned':
        playSound('summon')
        splashAt(fighterElement(event.side), INK.arcane, 10, 0.6)
        break
      case 'death':
        playSound(event.side === 'enemy' ? 'victory' : 'defeat')
        splashAt(fighterElement(event.side), INK.ink, 40, 1.8)
        break
      default:
        break
    }
  }
}
