# Inkcaster — Game design

> _Write your spells. Survive the duel. Rewrite yourself._

Inkcaster is a solo, browser-based **roguelite deckbuilder** with **die-and-retry** meta-progression. You are an inkcaster, a mage whose spells are written on the pages of a grimoire. You duel rival inkcasters, die, earn gold, spend it in the Scriptorium, and start a stronger run.

## Core loop

1. Start a run with a **weak starter deck** (8-10 basic spells).
2. Fight a chain of 6-8 duels against rival inkcasters, ending with a boss.
3. After each duel, gain gold and pick **1 of 3** temporary spell rewards.
4. Whether you win or die, you earn gold: more for deeper progress, a small consolation on death.
5. Spend gold in the **Scriptorium** (the hub) on permanent progression, then start a new run.

## Combat: timeline turns

Decided after the first playtest (2026-11-01). Real time rewarded click speed over decisions.

- **Time only moves when you act.** On your turn the clock is frozen. You cast one page or **gather ink** (1s).
- **Every page has a time cost.** After casting, your next turn comes that many seconds later. Fast weak pages and slow strong pages are a real trade-off.
- **One shared timeline.** Rival inkcasters cast on it with a **telegraphed cast bar**. The screen shows when each rival spell lands, and where your next turn would fall for each page.
- **Ink** regenerates with timeline time, not per turn. Scarce ink plus time costs means you can't cast everything.
- **The hand** holds 5 pages. A cast page is discarded and replaced immediately, so holding pages is free. `draw` grows the hand up to 7.
- **Wards absorb only the next hit.** Whatever is left is lost, and this applies to rivals too. Timing a ward against the right spell, and breaking a rival's ward with a small hit before a big one, are core decisions.
- Rivals with a fixed rotation are fully predictable on the timeline. Weighted rivals only reveal a spell when its cast bar starts.
- Later (Phase 3): minions and enchantments act on the timeline; counters and interrupts cancel or delay rival casts.
- Deliberately unlike Slay the Spire: no energy refill per turn, no discard-hand-at-end-of-turn, no block that resets every turn. Tempo is about time, not turns.

## Spell types

Direct spells, enchantments (persistent buffs and auras), minions (summons with attack timers), wards and shields, counters and interrupts, utility (draw, gain ink).

## Archetypes (target: 5 for v1)

Fire burst, Ice control, Minion swarm, Arcane/combo, Ward/defence.

## Meta-progression (Scriptorium)

- **Grimoire:** buy new spells into the unlockable pool.
- **Rewrite (Forge):** upgrade spells permanently from tier I to tier III. A higher tier has more ornate calligraphy.
- **Bindings:** passive talents (max HP, ink regen, starting shield, extra hand slot...).
- **Loadouts:** starting decks / mage classes (3 for v1).

## Theme and vocabulary

| Concept  | Term             |
| -------- | ---------------- |
| Mana     | Ink              |
| Card     | Spell / Page     |
| Deck     | Grimoire / Tome  |
| Hub      | Scriptorium      |
| Upgrade  | Rewrite          |
| Passives | Bindings         |
| Enemies  | Rival inkcasters |

Visual direction: ink black and deep indigo on aged parchment, with one accent ink color per element (fire = red, ice = blue, arcane = violet). On death, pages burn or blur.

## Card data shape

Reference only; the real types will live in `src/engine` and `src/data`.

```ts
{
  id: "ember_bolt",
  name: "Ember Bolt",
  type: "direct",            // direct | enchantment | minion | ward | counter | utility
  cost: 2,                   // ink
  time: 1.25,                // timeline cost in seconds
  tags: ["fire"],
  effects: [{ kind: "damage", amount: 6, target: "enemy" }],
  upgrades: [
    { tier: 2, effects: [{ kind: "damage", amount: 9 }] },
    { tier: 3, effects: [{ kind: "damage", amount: 12 }, { kind: "applyStatus", status: "burn", stacks: 2 }] }
  ]
}
```

Effects: `damage`, `heal`, `shield`, `applyStatus`, `summon`, `draw`, `gainInk`, `counter`, `modifyNextCard`. Triggers: `onPlay`, `onTick`, `onDeath`, `onHit`. Keep this vocabulary small and composable, so that synergies emerge from combinations.

## v1 content targets

Starter spells 8-10 | Total spells 60-80 (3 tiers each) | Enemies 8-10 + 2-3 bosses | Statuses 8-10 | Bindings 20-25 | Loadouts 3.

## Tech stack

| Concern       | Choice                                   |
| ------------- | ---------------------------------------- |
| Language      | TypeScript (strict)                      |
| Build         | Vite                                     |
| UI            | React + CSS animations                   |
| VFX           | PixiJS canvas layer behind the UI        |
| UI state      | Zustand                                  |
| Combat engine | Custom, pure TypeScript                  |
| Audio         | Howler.js                                |
| Persistence   | IndexedDB via `idb-keyval`               |
| Tests         | Vitest                                   |
| Hosting       | GitHub Pages (itch.io later for release) |

Add each dependency in the phase that first needs it (for example, Pixi in Phase 7 and idb-keyval in Phase 5), not upfront.
