import { describe, expect, it } from 'vitest'
import { applyChill, composeSpell } from '../../src/engine/index.ts'
import { makeContent } from './fixtures.ts'

const content = makeContent()

describe('composeSpell', () => {
  it('a lone verb casts its effects once', () => {
    expect(composeSpell(content, ['strike'])).toEqual({
      ok: true,
      once: [{ kind: 'damage', amount: 4 }],
      times: 1,
      effects: [{ kind: 'damage', amount: 4 }],
      edits: 0,
      echo: false,
      extraWords: 0,
      wordCount: 1,
    })
  })

  it('needs exactly one verb', () => {
    expect(composeSpell(content, ['twice', 'fire'])).toEqual({ ok: false, reason: 'needOneVerb' })
    expect(composeSpell(content, ['strike', 'ward'])).toEqual({
      ok: false,
      reason: 'needOneVerb',
    })
  })

  it('amplify adds to the verb numbers only', () => {
    const result = composeSpell(content, ['greater', 'fire', 'strike'])
    expect(result.ok && result.once).toEqual([
      { kind: 'damage', amount: 7 },
      { kind: 'applyStatus', status: 'burn', stacks: 2 },
    ])
  })

  it('repeat casts the whole spell again, inks included', () => {
    const result = composeSpell(content, ['fire', 'strike', 'twice'])
    expect(result.ok && result.times).toBe(2)
    expect(result.ok && result.effects).toEqual([
      { kind: 'damage', amount: 4 },
      { kind: 'applyStatus', status: 'burn', stacks: 2 },
      { kind: 'damage', amount: 4 },
      { kind: 'applyStatus', status: 'burn', stacks: 2 },
    ])
  })

  it('stacks modifiers: two Twice cast four times, two Greater add +6', () => {
    const twice = composeSpell(content, ['strike', 'twice', 'twice'])
    expect(twice.ok && twice.times).toBe(4)
    const greater = composeSpell(content, ['ward', 'greater', 'greater'])
    expect(greater.ok && greater.once).toEqual([{ kind: 'shield', amount: 12 }])
  })

  it('word order does not change the result', () => {
    expect(composeSpell(content, ['twice', 'strike', 'greater'])).toEqual(
      composeSpell(content, ['greater', 'twice', 'strike']),
    )
  })

  it('counts edit words but they add no effects', () => {
    const result = composeSpell(content, ['strike', 'erase'])
    expect(result.ok && result.edits).toBe(1)
    expect(result.ok && result.effects).toEqual([{ kind: 'damage', amount: 4 }])
  })
})

describe('applyChill', () => {
  it('lowers each outgoing hit, never below zero, and leaves the rest alone', () => {
    expect(
      applyChill(
        [
          { kind: 'damage', amount: 4 },
          { kind: 'damage', amount: 2 },
          { kind: 'shield', amount: 6 },
          { kind: 'damage', amount: 5, target: 'self' },
        ],
        3,
      ),
    ).toEqual([
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 0 },
      { kind: 'shield', amount: 6 },
      { kind: 'damage', amount: 5, target: 'self' },
    ])
  })
})
