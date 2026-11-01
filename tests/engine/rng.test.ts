import { describe, expect, it } from 'vitest'
import { nextRandom, randomInt, seedRng, shuffle } from '../../src/engine/index.ts'

function sequence(seed: number, length: number): number[] {
  const values: number[] = []
  let rng = seedRng(seed)
  for (let i = 0; i < length; i++) {
    const [value, next] = nextRandom(rng)
    values.push(value)
    rng = next
  }
  return values
}

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20))
  })

  it('produces different sequences for different seeds', () => {
    expect(sequence(1, 5)).not.toEqual(sequence(2, 5))
  })

  it('stays in [0, 1)', () => {
    for (const value of sequence(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('randomInt stays in [0, max)', () => {
    let rng = seedRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const [value, next] = randomInt(rng, 6)
      seen.add(value)
      rng = next
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('shuffle is a deterministic permutation and leaves the input untouched', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const [a, rngA] = shuffle(items, seedRng(9))
    const [b, rngB] = shuffle(items, seedRng(9))
    expect(a).toEqual(b)
    expect(rngA).toBe(rngB)
    expect([...a].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
