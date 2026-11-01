import { describe, expect, it } from 'vitest'
import {
  BASE_PLAYER,
  ENEMIES,
  LOADOUTS,
  WORDS,
  WORDS_BY_ID,
  duelContent,
} from '../../src/data/index.ts'
import { composeSpell, type Effect } from '../../src/engine/index.ts'

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

function checkEffect(effect: Effect): void {
  switch (effect.kind) {
    case 'damage':
      // Scaling damage (Litany) may have a base of 0.
      expect(effect.amount).toBeGreaterThanOrEqual(effect.scaling ? 0 : 1)
      if (effect.scaling) expect(effect.scaling.each).toBeGreaterThan(0)
      return
    case 'heal':
    case 'shield':
      expect(effect.amount).toBeGreaterThan(0)
      return
    case 'applyStatus':
      expect(effect.stacks).toBeGreaterThan(0)
      return
    case 'draw':
      expect(effect.count).toBeGreaterThan(0)
      return
    case 'summon':
      expect(effect.minion.attack).toBeGreaterThan(0)
      expect(effect.minion.turns).toBeGreaterThan(0)
      return
    case 'rally':
      expect(effect.bonus).toBeGreaterThanOrEqual(0)
      return
    case 'counter':
      return
  }
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
        expect(composeSpell(duelContent(enemy.id), spell.words).ok, spell.words.join(' ')).toBe(
          true,
        )
      }
    }
  })
})

describe('loadouts', () => {
  it('have unique ids, only existing words, can fill the hand and hold enough verbs', () => {
    const ids = LOADOUTS.map((loadout) => loadout.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const loadout of LOADOUTS) {
      expect(loadout.id).toMatch(SNAKE_CASE)
      for (const id of loadout.deck) expect(WORDS_BY_ID[id], `${loadout.id}: ${id}`).toBeDefined()
      expect(loadout.deck.length).toBeGreaterThan(BASE_PLAYER.handSize)
      const verbs = loadout.deck.filter((id) => WORDS_BY_ID[id]?.kind === 'verb')
      expect(verbs.length / loadout.deck.length, loadout.id).toBeGreaterThanOrEqual(0.4)
    }
  })
})

describe('content targets', () => {
  it('Phase 3: about 30 words and 5 archetype loadouts', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(28)
    expect(LOADOUTS.length).toBeGreaterThanOrEqual(6)
  })

  it('rivals never use player-only effects (draw, counter)', () => {
    for (const enemy of ENEMIES) {
      for (const spell of enemy.spells) {
        for (const id of spell.words) {
          const word = WORDS_BY_ID[id]
          const effects = word && (word.kind === 'verb' || word.kind === 'ink') ? word.effects : []
          for (const effect of effects) {
            expect(['draw', 'counter'], `${enemy.id}: ${id}`).not.toContain(effect.kind)
          }
        }
      }
    }
  })
})
