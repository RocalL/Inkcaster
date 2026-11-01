import type { EnemyDef } from '../engine/index.ts'

// Rivals write with the same words as the player, so their intents read like spells
// and the player's Erase works on them. Rivals are not limited to three words: their
// long sentences are what makes erasing the right word matter.

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'ash_adept',
    name: 'Ash Adept',
    maxHp: 48,
    behaviour: 'rotation',
    spells: [
      { words: ['fire', 'strike'] },
      { words: ['greater', 'ward'] },
      { words: ['strike', 'twice'] },
      { words: ['greater', 'fire', 'strike', 'twice'] },
    ],
  },
  {
    id: 'frost_scribe',
    name: 'Frost Scribe',
    maxHp: 48,
    behaviour: 'weighted',
    spells: [
      { words: ['ice', 'strike', 'twice'], weight: 3 },
      { words: ['greater', 'ward'], weight: 1 },
      { words: ['greater', 'mend'], weight: 1 },
      { words: ['greater', 'strike', 'twice'], weight: 3 },
    ],
  },
]
