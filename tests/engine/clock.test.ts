import { describe, expect, it } from 'vitest'
import {
  MAX_STEPS_PER_FRAME,
  TICKS_PER_SECOND,
  advanceClock,
  durationTicks,
  secondsToTicks,
} from '../../src/engine/index.ts'

describe('time', () => {
  it('runs at 20 ticks per second', () => {
    expect(TICKS_PER_SECOND).toBe(20)
    expect(secondsToTicks(3)).toBe(60)
    expect(secondsToTicks(0.5)).toBe(10)
  })

  it('durations are at least one tick', () => {
    expect(secondsToTicks(0)).toBe(0)
    expect(durationTicks(0)).toBe(1)
  })
})

describe('advanceClock', () => {
  it('turns elapsed time into whole steps and keeps the remainder', () => {
    expect(advanceClock(0, 120, 1)).toEqual({ steps: 2, accumulatorMs: 20 })
    expect(advanceClock(20, 30, 1)).toEqual({ steps: 1, accumulatorMs: 0 })
  })

  it('pauses at speed 0', () => {
    expect(advanceClock(10, 1000, 0)).toEqual({ steps: 0, accumulatorMs: 10 })
  })

  it('slows time at speed 0.5', () => {
    expect(advanceClock(0, 100, 0.5)).toEqual({ steps: 1, accumulatorMs: 0 })
  })

  it('caps catch-up after a long frame and drops the backlog', () => {
    expect(advanceClock(0, 60_000, 1)).toEqual({ steps: MAX_STEPS_PER_FRAME, accumulatorMs: 0 })
  })

  it('ignores negative elapsed time', () => {
    expect(advanceClock(10, -500, 1)).toEqual({ steps: 0, accumulatorMs: 10 })
  })
})
