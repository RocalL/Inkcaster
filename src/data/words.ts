import type { WordDef } from '../engine/index.ts'

// All words. A spell is one verb plus up to two other words (Verbose allows more).
// Numbers are tuned with `npm run sim`.

export const WORDS: readonly WordDef[] = [
  // --- Core verbs
  { id: 'strike', name: 'Strike', kind: 'verb', effects: [{ kind: 'damage', amount: 4 }] },
  { id: 'ward', name: 'Ward', kind: 'verb', effects: [{ kind: 'shield', amount: 6 }] },
  { id: 'mend', name: 'Mend', kind: 'verb', effects: [{ kind: 'heal', amount: 5 }] },
  {
    id: 'drain',
    name: 'Drain',
    kind: 'verb',
    effects: [
      { kind: 'damage', amount: 3 },
      { kind: 'heal', amount: 2 },
    ],
  },

  // --- Fire burst: stack Burn, then cash it in
  {
    id: 'kindle',
    name: 'Kindle',
    kind: 'verb',
    effects: [{ kind: 'applyStatus', status: 'burn', stacks: 3 }],
  },
  {
    id: 'ignite',
    name: 'Ignite',
    kind: 'verb',
    effects: [{ kind: 'damage', amount: 2, scaling: { per: 'targetBurn', each: 1 } }],
  },

  // --- Ice control: weaken the rival's spells, cancel them, shatter the frozen
  {
    id: 'freeze',
    name: 'Freeze',
    kind: 'verb',
    effects: [{ kind: 'applyStatus', status: 'chill', stacks: 5 }],
  },
  {
    id: 'shatter',
    name: 'Shatter',
    kind: 'verb',
    effects: [
      { kind: 'damage', amount: 4, scaling: { per: 'targetChill', each: 3, consume: true } },
    ],
  },
  { id: 'blot', name: 'Blot', kind: 'verb', effects: [{ kind: 'counter' }] },

  // --- Minion swarm: familiars strike at the end of your turn
  {
    id: 'call',
    name: 'Call',
    kind: 'verb',
    effects: [{ kind: 'summon', minion: { name: 'Inkling', attack: 2, turns: 2 } }],
  },
  { id: 'rally', name: 'Rally', kind: 'verb', effects: [{ kind: 'rally', bonus: 1 }] },

  // --- Arcane combo: long sentences, set-ups, card flow
  {
    id: 'focus',
    name: 'Focus',
    kind: 'verb',
    effects: [{ kind: 'applyStatus', status: 'focus', stacks: 5, target: 'self' }],
  },
  {
    id: 'litany',
    name: 'Litany',
    kind: 'verb',
    effects: [{ kind: 'damage', amount: 0, scaling: { per: 'spellWords', each: 3 } }],
  },
  { id: 'study', name: 'Study', kind: 'verb', effects: [{ kind: 'draw', count: 2 }] },

  // --- Ward defence: big wards, hit back
  { id: 'bulwark', name: 'Bulwark', kind: 'verb', effects: [{ kind: 'shield', amount: 9 }] },
  {
    id: 'riposte',
    name: 'Riposte',
    kind: 'verb',
    effects: [{ kind: 'damage', amount: 1, scaling: { per: 'ownWard', each: 1 } }],
  },

  // --- Modifiers
  { id: 'twice', name: 'Twice', kind: 'modifier', modifier: { type: 'repeat', times: 2 } },
  { id: 'thrice', name: 'Thrice', kind: 'modifier', modifier: { type: 'repeat', times: 3 } },
  { id: 'greater', name: 'Greater', kind: 'modifier', modifier: { type: 'amplify', amount: 3 } },
  { id: 'echo', name: 'Echo', kind: 'modifier', modifier: { type: 'echo' } },
  { id: 'verbose', name: 'Verbose', kind: 'modifier', modifier: { type: 'expand', words: 2 } },

  // --- Inks
  {
    id: 'fire',
    name: 'Fire',
    kind: 'ink',
    element: 'fire',
    effects: [{ kind: 'applyStatus', status: 'burn', stacks: 2 }],
  },
  {
    id: 'ice',
    name: 'Ice',
    kind: 'ink',
    element: 'ice',
    effects: [{ kind: 'applyStatus', status: 'chill', stacks: 3 }],
  },
  {
    id: 'arcane',
    name: 'Arcane',
    kind: 'ink',
    element: 'arcane',
    effects: [{ kind: 'draw', count: 1 }],
  },
  {
    id: 'spirit',
    name: 'Spirit',
    kind: 'ink',
    element: 'spirit',
    effects: [{ kind: 'summon', minion: { name: 'Wisp', attack: 1, turns: 2 } }],
  },
  {
    id: 'thorn',
    name: 'Thorn',
    kind: 'ink',
    element: 'thorn',
    effects: [{ kind: 'applyStatus', status: 'thorns', stacks: 2, target: 'self' }],
  },
  {
    id: 'verdant',
    name: 'Verdant',
    kind: 'ink',
    element: 'verdant',
    effects: [{ kind: 'applyStatus', status: 'regen', stacks: 3, target: 'self' }],
  },

  // --- Edits
  { id: 'erase', name: 'Erase', kind: 'edit', edit: 'erase' },
]
