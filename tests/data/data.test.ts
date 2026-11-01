import { describe, expect, it } from 'vitest'
import { ENEMIES, SPELLS, STARTER_PLAYER, STARTER_SPELLS } from '../../src/data/index.ts'
import type { Effect } from '../../src/engine/index.ts'

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

function checkEffect(effect: Effect): void {
  if (effect.kind === 'draw') expect(effect.count).toBeGreaterThan(0)
  else expect(effect.amount).toBeGreaterThan(0)
}

describe('spells', () => {
  it('have unique snake_case ids', () => {
    const ids = STARTER_SPELLS.map((spell) => spell.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(SNAKE_CASE)
  })

  it('have sane numbers', () => {
    for (const spell of STARTER_SPELLS) {
      expect(Number.isInteger(spell.cost), spell.id).toBe(true)
      expect(spell.cost, spell.id).toBeGreaterThanOrEqual(0)
      expect(spell.cooldown, spell.id).toBeGreaterThan(0)
      expect(spell.effects.length, spell.id).toBeGreaterThan(0)
      spell.effects.forEach(checkEffect)
    }
  })

  it('v1 target: 8-10 starter spells', () => {
    expect(STARTER_SPELLS.length).toBeGreaterThanOrEqual(8)
    expect(STARTER_SPELLS.length).toBeLessThanOrEqual(10)
  })
})

describe('enemies', () => {
  it('have unique snake_case ids and at least one spell', () => {
    const ids = ENEMIES.map((enemy) => enemy.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const enemy of ENEMIES) {
      expect(enemy.id).toMatch(SNAKE_CASE)
      expect(enemy.maxHp).toBeGreaterThan(0)
      expect(enemy.spells.length).toBeGreaterThan(0)
      for (const spell of enemy.spells) {
        expect(spell.id).toMatch(SNAKE_CASE)
        expect(spell.castTime).toBeGreaterThan(0)
        spell.effects.forEach(checkEffect)
      }
    }
  })
})

describe('starter player', () => {
  it('only references existing spells and can fill the hand', () => {
    for (const id of STARTER_PLAYER.grimoire) expect(SPELLS[id], id).toBeDefined()
    expect(STARTER_PLAYER.grimoire.length).toBeGreaterThan(STARTER_PLAYER.handSize)
  })
})
