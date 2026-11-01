import { describe, expect, it } from 'vitest'
import { starterDuel } from '../../src/data/index.ts'
import { describeEffect, describeEffects, describeEvent } from '../../src/ui/text.ts'

describe('describeEffect', () => {
  it('words every effect kind from the caster point of view', () => {
    expect(describeEffect({ kind: 'damage', amount: 6 })).toBe('Deal 6 damage')
    expect(describeEffect({ kind: 'damage', amount: 2, target: 'self' })).toBe('Take 2 damage')
    expect(describeEffect({ kind: 'heal', amount: 5 })).toBe('Heal 5')
    expect(describeEffect({ kind: 'shield', amount: 8 })).toBe('Gain 8 shield')
    expect(describeEffect({ kind: 'draw', count: 1 })).toBe('Draw a page')
    expect(describeEffect({ kind: 'draw', count: 2 })).toBe('Draw 2 pages')
  })

  it('joins several effects', () => {
    expect(
      describeEffects([
        { kind: 'damage', amount: 4 },
        { kind: 'shield', amount: 2 },
      ]),
    ).toBe('Deal 4 damage. Gain 2 shield')
  })
})

describe('describeEvent', () => {
  const content = starterDuel('ash_adept')

  it('names spells and sides', () => {
    expect(
      describeEvent({ type: 'spellCast', side: 'player', spellId: 'ember_bolt' }, content),
    ).toBe('You cast Ember Bolt')
    expect(
      describeEvent({ type: 'enemyCastStart', spellId: 'cinder_storm', castTicks: 60 }, content),
    ).toBe('Ash Adept begins Cinder Storm')
    expect(
      describeEvent({ type: 'damage', target: 'player', amount: 3, absorbed: 2 }, content),
    ).toBe('You took 3 (2 blocked)')
  })

  it('hides rejected commands', () => {
    expect(
      describeEvent({ type: 'commandRejected', slot: 0, reason: 'notEnoughInk' }, content),
    ).toBeNull()
  })
})
