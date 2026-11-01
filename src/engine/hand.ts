// The hand cycle: casting empties a slot for the spell's cooldown, then the slot draws
// the next page from the draw pile. The discard pile is reshuffled when the draw pile runs out.

import { shuffle } from './rng.ts'
import type { PlayerState, StepContext } from './state.ts'

export function tickInk(player: PlayerState): void {
  if (player.ink >= player.maxInk) {
    player.inkProgress = 0
    return
  }
  player.inkProgress += 1
  if (player.inkProgress >= player.ticksPerInk) {
    player.ink += 1
    player.inkProgress = 0
  }
}

/** Counts down recharging slots and fills the ones that are ready. */
export function tickHand(ctx: StepContext): void {
  ctx.state.player.hand.forEach((slot, index) => {
    if (slot.card) return
    if (slot.cooldown > 0) slot.cooldown -= 1
    if (slot.cooldown === 0) drawIntoSlot(ctx, index)
  })
}

/** Refills up to `count` empty slots immediately, those closest to ready first. */
export function drawCards(ctx: StepContext, count: number): void {
  const emptySlots = ctx.state.player.hand
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.card)
    .sort((a, b) => a.slot.cooldown - b.slot.cooldown || a.index - b.index)

  for (const { index } of emptySlots.slice(0, count)) {
    if (!drawIntoSlot(ctx, index)) return
  }
}

/** Returns false when there is no page left to draw; the slot then retries every tick. */
function drawIntoSlot(ctx: StepContext, slotIndex: number): boolean {
  const player = ctx.state.player
  const slot = player.hand[slotIndex]
  if (!slot) return false
  if (player.drawPile.length === 0) reshuffle(ctx)

  const card = player.drawPile.shift()
  if (!card) return false
  slot.card = card
  slot.cooldown = 0
  ctx.events.push({ type: 'cardDrawn', slot: slotIndex, spellId: card.spellId })
  return true
}

function reshuffle(ctx: StepContext): void {
  const player = ctx.state.player
  if (player.discardPile.length === 0) return
  const [deck, rng] = shuffle(player.discardPile, ctx.state.rng)
  ctx.state.rng = rng
  player.drawPile = deck
  player.discardPile = []
  ctx.events.push({ type: 'reshuffle', cards: deck.length })
}
