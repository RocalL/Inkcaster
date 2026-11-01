import { describe, expect, it } from 'vitest'
import { TICKS_PER_SECOND, secondsToTicks } from '../../src/engine'

describe('secondsToTicks', () => {
  it('runs at 20 ticks per second', () => {
    expect(TICKS_PER_SECOND).toBe(20)
  })

  it('converts card cooldowns to whole ticks', () => {
    expect(secondsToTicks(3)).toBe(60)
    expect(secondsToTicks(0.5)).toBe(10)
    expect(secondsToTicks(0.07)).toBe(1)
  })
})
