import { describe, expect, it } from 'vitest'
import { WORDS_BY_ID, starterDuel } from '../../src/data/index.ts'
import { composeSpell } from '../../src/engine/index.ts'
import { describeEffect, describeEvent, describeSpell, describeWord } from '../../src/ui/text.ts'

const content = starterDuel('ash_adept')
const word = (id: string) => {
  const found = WORDS_BY_ID[id]
  if (!found) throw new Error(id)
  return found
}

describe('describeEffect', () => {
  it('words every effect kind', () => {
    expect(describeEffect({ kind: 'damage', amount: 6 })).toBe('Deal 6 damage')
    expect(describeEffect({ kind: 'heal', amount: 5 })).toBe('Heal 5')
    expect(describeEffect({ kind: 'shield', amount: 8 })).toBe('Ward 8')
    expect(describeEffect({ kind: 'applyStatus', status: 'burn', stacks: 2 })).toBe('Burn 2')
    expect(describeEffect({ kind: 'draw', count: 1 })).toBe('Draw a word')
  })
})

describe('describeWord', () => {
  it('prints the rules of each kind of word', () => {
    expect(describeWord(word('strike'))).toBe('Deal 4 damage')
    expect(describeWord(word('twice'))).toBe('Cast the spell twice')
    expect(describeWord(word('greater'))).toBe("+3 to the verb's numbers")
    expect(describeWord(word('fire'))).toBe('Burn 2')
    expect(describeWord(word('erase'))).toBe("Strike out a word of the rival's next spell")
  })
})

describe('describeSpell', () => {
  it('reads a composed spell in one line', () => {
    expect(describeSpell(composeSpell(content, ['greater', 'fire', 'strike']))).toBe(
      'Deal 7 damage, Burn 2',
    )
    expect(describeSpell(composeSpell(content, ['strike', 'twice']))).toBe('Deal 4 damage — twice')
    expect(describeSpell(composeSpell(content, ['twice']))).toBe('A spell needs exactly one verb')
  })
})

describe('describeEvent', () => {
  it('tells the duel from the player point of view', () => {
    expect(
      describeEvent({ type: 'spellWritten', side: 'player', words: ['fire', 'strike'] }, content),
    ).toBe('You cast “Fire Strike”')
    expect(describeEvent({ type: 'wordErased', wordId: 'twice' }, content)).toBe(
      'You erase “Twice”',
    )
    expect(
      describeEvent(
        { type: 'damage', target: 'enemy', amount: 2, absorbed: 0, source: 'burn' },
        content,
      ),
    ).toBe('Ash Adept took 2 from Burn')
    expect(describeEvent({ type: 'commandRejected', reason: 'needOneVerb' }, content)).toBeNull()
  })
})
