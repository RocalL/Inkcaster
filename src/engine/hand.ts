// Word pages: hand, draw pile, discard pile. The discard pile is reshuffled when the draw
// pile runs out.

import { shuffle } from './rng.ts'
import type { ActionContext, WordCard } from './state.ts'

/** `draw` effects can grow the hand above its normal size, up to this. */
export const MAX_HAND_SIZE = 8

/** Moves the cards at `indices` from the hand to the discard pile. */
export function discardFromHand(ctx: ActionContext, indices: readonly number[]): WordCard[] {
  const player = ctx.state.player
  const picked = indices.flatMap((index) => {
    const card = player.hand[index]
    return card ? [card] : []
  })
  player.hand = player.hand.filter((card) => !picked.includes(card))
  player.discardPile.push(...picked)
  return picked
}

/** Draws until the hand holds `size` words (or nothing is left to draw). */
export function refillHand(ctx: ActionContext, size: number): void {
  const missing = size - ctx.state.player.hand.length
  if (missing > 0) drawWords(ctx, missing)
}

export function drawWords(ctx: ActionContext, count: number): void {
  const hand = ctx.state.player.hand
  for (let i = 0; i < count && hand.length < MAX_HAND_SIZE; i++) {
    const card = takeFromDrawPile(ctx)
    if (!card) return
    hand.push(card)
    ctx.events.push({ type: 'wordDrawn', wordId: card.wordId })
  }
}

function takeFromDrawPile(ctx: ActionContext): WordCard | undefined {
  const player = ctx.state.player
  if (player.drawPile.length === 0) reshuffle(ctx)
  return player.drawPile.shift()
}

function reshuffle(ctx: ActionContext): void {
  const player = ctx.state.player
  if (player.discardPile.length === 0) return
  const [deck, rng] = shuffle(player.discardPile, ctx.state.rng)
  ctx.state.rng = rng
  player.drawPile = deck
  player.discardPile = []
  ctx.events.push({ type: 'reshuffle', cards: deck.length })
}
