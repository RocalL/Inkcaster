// Seeded, pure RNG (mulberry32). The state is a plain 32-bit integer stored in CombatState,
// so a combat can be cloned, saved and replayed exactly.

export type RngState = number

/** Scrambles the seed (murmur3 finalizer) so that consecutive seeds start far apart. */
export function seedRng(seed: number): RngState {
  let h = seed | 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) | 0
}

/** Returns a float in [0, 1) and the next RNG state. */
export function nextRandom(rng: RngState): [value: number, next: RngState] {
  const next = (rng + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Returns an integer in [0, maxExclusive). */
export function randomInt(rng: RngState, maxExclusive: number): [value: number, next: RngState] {
  const [value, next] = nextRandom(rng)
  return [Math.floor(value * maxExclusive), next]
}

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: RngState): [shuffled: T[], next: RngState] {
  const result = [...items]
  let state = rng
  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = randomInt(state, i + 1)
    state = next
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return [result, state]
}
