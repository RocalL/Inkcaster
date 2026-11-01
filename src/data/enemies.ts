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
  {
    id: 'bramble_warden',
    name: 'Bramble Warden',
    maxHp: 58,
    behaviour: 'rotation',
    spells: [
      { words: ['thorn', 'ward'] },
      { words: ['greater', 'strike', 'twice'] },
      { words: ['greater', 'bulwark'] },
      { words: ['greater', 'riposte'] },
    ],
  },
  {
    id: 'inkling_mother',
    name: 'Inkling Mother',
    maxHp: 50,
    behaviour: 'weighted',
    spells: [
      { words: ['call', 'twice'], weight: 2 },
      { words: ['greater', 'rally'], weight: 2 },
      { words: ['spirit', 'strike', 'twice'], weight: 2 },
      { words: ['ward'], weight: 1 },
    ],
  },
  {
    // Boss. Telegraphs Focus, then a Focused "Strike Thrice" (27): Erase Thrice or Blot it.
    id: 'archivist',
    name: 'The Archivist',
    maxHp: 65,
    behaviour: 'rotation',
    spells: [
      { words: ['ice', 'strike', 'twice'] },
      { words: ['greater', 'ward', 'thorn'] },
      { words: ['call', 'twice'] },
      { words: ['focus'] },
      { words: ['strike', 'thrice'] },
    ],
  },
  {
    id: 'hex_weaver',
    name: 'Hex Weaver',
    maxHp: 46,
    behaviour: 'rotation',
    spells: [
      { words: ['hex'] },
      { words: ['shadow', 'strike', 'twice'] },
      { words: ['greater', 'ward'] },
      { words: ['brand'] },
      { words: ['smite'] },
    ],
  },
  {
    id: 'storm_caller',
    name: 'Storm Caller',
    maxHp: 44,
    behaviour: 'weighted',
    spells: [
      { words: ['volley'], weight: 3 },
      { words: ['storm', 'strike', 'twice'], weight: 2 },
      { words: ['torrent', 'greater'], weight: 1 },
      { words: ['stone', 'ward'], weight: 1 },
    ],
  },
  {
    id: 'blood_scribe',
    name: 'Blood Scribe',
    maxHp: 46,
    behaviour: 'weighted',
    spells: [
      { words: ['vampiric', 'strike', 'twice'], weight: 3 },
      { words: ['leech'], weight: 2 },
      { words: ['storm', 'strike', 'twice'], weight: 2 },
      { words: ['bloom'], weight: 1 },
    ],
  },
  {
    id: 'golem_wright',
    name: 'Golem Wright',
    maxHp: 52,
    behaviour: 'rotation',
    spells: [
      { words: ['golem'] },
      { words: ['stone', 'strike'] },
      { words: ['greater', 'rally'] },
      { words: ['greater', 'ward'] },
    ],
  },
  {
    id: 'censor',
    name: 'The Censor',
    maxHp: 50,
    behaviour: 'rotation',
    spells: [
      { words: ['lance'] },
      { words: ['piercing', 'strike', 'twice'] },
      { words: ['aegis'] },
      { words: ['greater', 'lance'] },
    ],
  },
  {
    // Boss. Stacks Burn on you, then Conflagrates it: Purge or Erase the Fire words.
    id: 'pyre_queen',
    name: 'The Pyre Queen',
    maxHp: 70,
    behaviour: 'rotation',
    spells: [
      { words: ['greater', 'kindle'] },
      { words: ['cinder', 'twice'] },
      { words: ['cinderwall', 'fire'] },
      { words: ['conflagrate', 'greater'] },
    ],
  },
  {
    // Boss. Brands you, then Smites: keep a ward or Redact the Smite.
    id: 'inquisitor',
    name: 'The Inquisitor',
    maxHp: 70,
    behaviour: 'rotation',
    spells: [
      { words: ['brand', 'intensify'] },
      { words: ['greater', 'smite'] },
      { words: ['hex'] },
      { words: ['piercing', 'volley'] },
      { words: ['aegis', 'thorn'] },
    ],
  },
]
