import type { WordDef } from '../engine/index.ts'

// Starter words. A spell is one verb plus up to two other words. Numbers are first-pass
// placeholders, tuned with `npm run sim`.

export const WORDS: readonly WordDef[] = [
  // Verbs
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

  // Modifiers
  { id: 'twice', name: 'Twice', kind: 'modifier', modifier: { type: 'repeat', times: 2 } },
  { id: 'greater', name: 'Greater', kind: 'modifier', modifier: { type: 'amplify', amount: 3 } },

  // Inks
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

  // Edits
  { id: 'erase', name: 'Erase', kind: 'edit', edit: 'erase' },
]
