// Pure, deterministic combat engine. See CLAUDE.md for the rules this folder must follow.

export * from './time.ts'
export * from './types.ts'
export * from './events.ts'
export * from './rng.ts'
export * from './state.ts'
export * from './sim.ts'
export { chooseEnemySpell } from './ai.ts'
export { greedyBot } from './bot.ts'
