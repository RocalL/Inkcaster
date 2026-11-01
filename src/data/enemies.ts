import type { EnemyDef } from '../engine/index.ts'

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'ash_adept',
    name: 'Ash Adept',
    maxHp: 40,
    behaviour: 'rotation',
    castGap: 1.5,
    spells: [
      {
        id: 'ember_lash',
        name: 'Ember Lash',
        castTime: 1.5,
        effects: [{ kind: 'damage', amount: 5 }],
      },
      {
        id: 'smoke_veil',
        name: 'Smoke Veil',
        castTime: 1,
        effects: [{ kind: 'shield', amount: 6 }],
      },
      {
        id: 'ember_lash',
        name: 'Ember Lash',
        castTime: 1.5,
        effects: [{ kind: 'damage', amount: 5 }],
      },
      {
        id: 'cinder_storm',
        name: 'Cinder Storm',
        castTime: 3,
        effects: [{ kind: 'damage', amount: 12 }],
      },
    ],
  },
  {
    id: 'frost_scribe',
    name: 'Frost Scribe',
    maxHp: 50,
    behaviour: 'weighted',
    castGap: 2,
    spells: [
      {
        id: 'frost_needle',
        name: 'Frost Needle',
        castTime: 1,
        weight: 3,
        effects: [{ kind: 'damage', amount: 3 }],
      },
      {
        id: 'glacial_ward',
        name: 'Glacial Ward',
        castTime: 1.5,
        weight: 2,
        effects: [{ kind: 'shield', amount: 10 }],
      },
      {
        id: 'cold_mending',
        name: 'Cold Mending',
        castTime: 2,
        weight: 1,
        effects: [{ kind: 'heal', amount: 6 }],
      },
      {
        id: 'blizzard',
        name: 'Blizzard',
        castTime: 3.5,
        weight: 1,
        effects: [{ kind: 'damage', amount: 14 }],
      },
    ],
  },
]
