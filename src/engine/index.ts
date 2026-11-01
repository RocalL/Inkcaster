// Pure, deterministic combat engine. See CLAUDE.md for the rules this folder must follow.

/** Fixed simulation rate. All engine timings are expressed in ticks. */
export const TICKS_PER_SECOND = 20

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND)
}
