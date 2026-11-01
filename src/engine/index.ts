// Pure, deterministic duel engine. See CLAUDE.md for the rules this folder must follow.

export * from './types.ts'
export * from './events.ts'
export * from './rng.ts'
export * from './state.ts'
export * from './spell.ts'
export * from './duel.ts'
export { chooseEnemySpell } from './ai.ts'
export { MAX_HAND_SIZE } from './hand.ts'
export { greedyBot } from './bot.ts'
