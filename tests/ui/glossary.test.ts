import { describe, expect, it } from 'vitest'
import { GLOSSARY, splitKeywords } from '../../src/ui/glossary.ts'

describe('splitKeywords', () => {
  it('marks glossary keywords and keeps the text intact', () => {
    const parts = splitKeywords('Deal 4 damage, Burn 2, then Ward 6')
    expect(parts.map((part) => part.text).join('')).toBe('Deal 4 damage, Burn 2, then Ward 6')
    expect(parts.filter((part) => part.keyword).map((part) => part.keyword)).toEqual([
      'Burn',
      'Ward',
    ])
  })

  it('marks each keyword once per text, and only whole words', () => {
    const parts = splitKeywords('Burn and Burning Burn')
    expect(parts.filter((part) => part.keyword)).toHaveLength(1)
  })

  it('every keyword has a rule', () => {
    for (const [keyword, rule] of Object.entries(GLOSSARY))
      expect(rule.length, keyword).toBeGreaterThan(10)
  })
})
