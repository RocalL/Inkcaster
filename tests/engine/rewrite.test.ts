import { describe, expect, it } from 'vitest'
import { isRewritable, rewriteWord, rewriteWords, type WordDef } from '../../src/engine/index.ts'
import { TEST_WORDS } from './fixtures.ts'

const word = (id: string): WordDef => {
  const found = TEST_WORDS[id]
  if (!found) throw new Error(id)
  return found
}

describe('rewriteWord', () => {
  it('tier I is the word as written', () => {
    expect(rewriteWord(word('strike'), 1)).toBe(word('strike'))
  })

  it('adds about 25% per tier to plain numbers, at least +1', () => {
    expect(rewriteWord(word('strike'), 2)).toMatchObject({ effects: [{ amount: 5 }] })
    expect(rewriteWord(word('strike'), 3)).toMatchObject({ effects: [{ amount: 6 }] })
    expect(rewriteWord(word('ward'), 3)).toMatchObject({ effects: [{ amount: 9 }] })
    expect(rewriteWord(word('fire'), 2)).toMatchObject({ effects: [{ stacks: 3 }] })
  })

  it('scaling damage gets a flat +2 per tier, not a bigger multiplier', () => {
    expect(rewriteWord(word('riposte'), 3)).toMatchObject({
      effects: [{ amount: 4, scaling: { per: 'ownWard', each: 1 } }],
    })
  })

  it('familiars hit harder; Rally and Greater grow by 1 per tier', () => {
    expect(rewriteWord(word('call'), 2)).toMatchObject({
      effects: [{ minion: { attack: 3, turns: 2 } }],
    })
    expect(rewriteWord(word('rally'), 3)).toMatchObject({ effects: [{ bonus: 3 }] })
    expect(rewriteWord(word('greater'), 2)).toMatchObject({ modifier: { amount: 4 } })
  })

  it('words without numbers cannot be rewritten', () => {
    for (const id of ['twice', 'echo', 'verbose', 'erase', 'blot', 'arcane']) {
      expect(isRewritable(word(id)), id).toBe(false)
      expect(rewriteWord(word(id), 3)).toBe(word(id))
    }
    expect(isRewritable(word('strike'))).toBe(true)
  })

  it('rewriteWords applies tiers to a word table', () => {
    const words = rewriteWords(TEST_WORDS, { strike: 3 })
    expect(words.strike).toMatchObject({ effects: [{ amount: 6 }] })
    expect(words.ward).toBe(TEST_WORDS.ward)
  })
})
