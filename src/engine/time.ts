/** Fixed simulation rate. All engine timings are expressed in ticks. */
export const TICKS_PER_SECOND = 20

/** Real-time length of one tick, used by the fixed-step clock. */
export const TICK_MS = 1000 / TICKS_PER_SECOND

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND)
}

/** Like secondsToTicks, but never shorter than one tick (cooldowns, cast times). */
export function durationTicks(seconds: number): number {
  return Math.max(1, secondsToTicks(seconds))
}
