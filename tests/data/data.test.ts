import { describe, expect, it } from 'vitest'
import { ENEMIES, STARTER_PLAYER, WORDS, WORDS_BY_ID, starterDuel } from '../../src/data/index.ts'
import { composeSpell, type Effect } from '../../src/engine/index.ts'

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

function checkEffect(effect: Effect): void {
  if (effect.kind === 'draw') expect(effect.count).toBeGreaterThan(0)
  else if (effect.kind === 'applyStatus') expect(effect.stacks).toBeGreaterThan(0)
  else expect(effect.amount).toBeGreaterThan(0)
}

describe('words', () => {
  it('have unique snake_case ids', () => {
    const ids = WORDS.map((word) => word.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(SNAKE_CASE)
  })

  it('have sane effects', () => {
    for (const word of WORDS) {
      if (word.kind === 'verb' || word.kind === 'ink') {
        expect(word.effects.length, word.id).toBeGreaterThan(0)
        word.effects.forEach(checkEffect)
      }
    }
  })
})

describe('rivals', () => {
  it('have unique snake_case ids and only castable sentences', () => {
    const ids = ENEMIES.map((enemy) => enemy.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const enemy of ENEMIES) {
      expect(enemy.id).toMatch(SNAKE_CASE)
      expect(enemy.maxHp).toBeGreaterThan(0)
      expect(enemy.spells.length).toBeGreaterThan(0)
      for (const spell of enemy.spells) {
        for (const id of spell.words) expect(WORDS_BY_ID[id], id).toBeDefined()
        expect(composeSpell(starterDuel(enemy.id), spell.words).ok, spell.words.join(' ')).toBe(
          true,
        )
      }
    }
  })
})

describe('starter deck', () => {
  it('only uses existing words, can fill the hand and has enough verbs', () => {
    for (const id of STARTER_PLAYER.deck) expect(WORDS_BY_ID[id], id).toBeDefined()
    expect(STARTER_PLAYER.deck.length).toBeGreaterThan(STARTER_PLAYER.handSize)
    const verbs = STARTER_PLAYER.deck.filter((id) => WORDS_BY_ID[id]?.kind === 'verb')
    expect(verbs.length / STARTER_PLAYER.deck.length).toBeGreaterThanOrEqual(0.4)
  })
})
