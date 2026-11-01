// Ink and pages. A cast page goes to the discard pile and is replaced right away from the
// draw pile; the discard pile is reshuffled when the draw pile runs out.

import { shuffle } from './rng.ts'
import type { CardInstance, PlayerState, StepContext } from './state.ts'

/** `draw` effects can grow the hand above its starting size, up to this. */
export const MAX_HAND_SIZE = 7

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

/** Removes the page at `index`, discards it and refills the same position if the hand is short. */
export function playFromHand(ctx: StepContext, index: number): CardInstance | null {
  const player = ctx.state.player
  const [card] = player.hand.splice(index, 1)
  if (!card) return null
  player.discardPile.push(card)

  if (player.hand.length < ctx.content.player.handSize) {
    const next = takeFromDrawPile(ctx)
    if (next) {
      player.hand.splice(index, 0, next)
      ctx.events.push({ type: 'cardDrawn', slot: index, spellId: next.spellId })
    }
  }
  return card
}

/** Adds up to `count` pages to the end of the hand, never above MAX_HAND_SIZE. */
export function drawCards(ctx: StepContext, count: number): void {
  const hand = ctx.state.player.hand
  for (let i = 0; i < count && hand.length < MAX_HAND_SIZE; i++) {
    const card = takeFromDrawPile(ctx)
    if (!card) return
    hand.push(card)
    ctx.events.push({ type: 'cardDrawn', slot: hand.length - 1, spellId: card.spellId })
  }
}

function takeFromDrawPile(ctx: StepContext): CardInstance | undefined {
  const player = ctx.state.player
  if (player.drawPile.length === 0) reshuffle(ctx)
  return player.drawPile.shift()
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
