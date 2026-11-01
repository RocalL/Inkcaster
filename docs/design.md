# Inkcaster — Game design

> _Write your spells. Survive the duel. Rewrite yourself._

Inkcaster is a solo, browser-based **roguelite deckbuilder** with **die-and-retry** meta-progression. You are an inkcaster, a mage whose spells are written on the pages of a grimoire. You duel rival inkcasters, die, earn gold, spend it in the Scriptorium, and start a stronger run.

## Core loop

1. Start a run with a **weak starter deck** (8-10 basic spells).
2. Fight a chain of 6-8 duels against rival inkcasters, ending with a boss.
3. After each duel, gain gold and pick **1 of 3** temporary spell rewards.
4. Whether you win or die, you earn gold: more for deeper progress, a small consolation on death.
5. Spend gold in the **Scriptorium** (the hub) on permanent progression, then start a new run.

## Combat: spellwriting (v0)

Decided 2026-11-01 after two playtests. Real time was a click race, and timeline turns added reading for little payoff. The chosen fun is **writing your own spells**.

- **Words are the pages.** Every page in the grimoire is a word of one of four kinds:
  - **Verb**: what the spell does (Strike: deal 4; Ward: ward 6; Mend: heal 5; Drain: deal 3, heal 2).
  - **Modifier**: reshapes it (Greater: +3 to the verb's numbers; Twice: cast the whole spell twice).
  - **Ink**: adds an element (Fire: Burn 2; Ice: Chill 3; Arcane: draw a word).
  - **Edit**: changes the rival's next spell (Erase: strike out one of its words, not the verb).
- **Each turn you write one spell**: exactly one verb plus up to two other words (3 words max). Or discard any words and pass. Unused words stay in hand, and the hand refills to 6 after your turn.
- **Alternating turns, no clock.** You write, then the rival casts the sentence shown above it, then the rival reveals its next sentence.
- **Rivals write with the same words**, so their intent reads like a spell and Erase works on it. Rivals may use sentences longer than three words; their big sentences are the moments to Erase.
- **Statuses:** Burn deals its stacks at the start of the victim's turn, through wards, then drops by 1. Chill lowers each hit of the victim's next spell, then clears.
- **Wards absorb only the next hit**, then fade, on both sides.
- Word order does not matter in v0. Ordering rules ("the last word is emphasised", etc.) are a candidate for later.
- Deliberately unlike Slay the Spire: no energy, no playing cards one by one, no block reset. The unit of play is the sentence you compose.

## Word kinds and mechanics

- **Verbs**: Strike, Ward, Mend, Drain, Kindle, Ignite, Freeze, Shatter, Blot, Call, Rally, Focus, Litany, Study, Bulwark, Riposte.
- **Modifiers**: Twice, Thrice (repeat), Greater (+3 to the verb's numbers, including status stacks and Rally's bonus), Echo (recast at the start of your next turn), Verbose (+2 word slots).
- **Inks**: Fire (Burn 2), Ice (Chill 3), Arcane (draw), Spirit (summon a Wisp), Thorn (gain Thorns), Verdant (gain Regen).
- **Edits**: Erase.

Statuses:

- **Burn**: deals its stacks at the start of the victim's turn, through wards, then **halves**, so big stacks stay linear.
- **Chill**: weakens each hit of the victim's next spell.
- **Focus**: your next spell gets +N, like Greater.
- **Thorns**: whoever hits you takes N, even when your ward absorbs the hit; it drops by 1 each turn.
- **Regen**: heals N at the start of your turn, then drops by 1.

**Familiars** (minions) strike at the end of their owner's turn for a few turns; each side can have at most 4. Rally makes them strike immediately. **Blot** cancels the rival's next spell. It is player-only, because rivals show their spells in advance.

## Archetypes (target: 5 for v1)

Fire burst, Ice control, Minion swarm, Arcane/combo, Ward/defence. Each has a starting grimoire in `src/data/loadouts.ts`:

| Loadout    | Plan                                         | Sim profile (greedy bot, 2026-11-01)      |
| ---------- | -------------------------------------------- | ----------------------------------------- |
| Pyromancer | Kindle/Fire to stack Burn, Ignite to cash in | fast, fragile: 6-10 rounds, 15-30 HP left |
| Cryomancer | Freeze/Ice, Blot, Shatter                    | safe, slow: 9-12 rounds, 33-41 HP left    |
| Summoner   | Call/Spirit familiars, Rally                 | 6-9 rounds                                |
| Scholar    | Verbose + Litany, Focus, Echo                | risky: 77-83% wins                        |
| Warden     | Bulwark/Ward + Thorn, Riposte, Verdant       | tanky: 37-45 HP left                      |

## Meta-progression (Scriptorium)

- **Grimoire:** buy new spells into the unlockable pool.
- **Rewrite (Forge):** upgrade spells permanently from tier I to tier III. A higher tier has more ornate calligraphy.
- **Bindings:** passive talents (max HP, ink regen, starting shield, extra hand slot...).
- **Loadouts:** starting decks / mage classes (3 for v1).

## Theme and vocabulary

| Concept  | Term             |
| -------- | ---------------- |
| Mana     | Ink              |
| Card     | Word / Page      |
| Deck     | Grimoire / Tome  |
| Hub      | Scriptorium      |
| Upgrade  | Rewrite          |
| Passives | Bindings         |
| Enemies  | Rival inkcasters |

Visual direction: ink black and deep indigo on aged parchment, with one accent ink color per element (fire = red, ice = blue, arcane = violet). On death, pages burn or blur.

## Word data shape

The real types are in `src/engine/types.ts`.

```ts
{ id: "strike",  name: "Strike",  kind: "verb",     effects: [{ kind: "damage", amount: 4 }] }
{ id: "twice",   name: "Twice",   kind: "modifier", modifier: { type: "repeat", times: 2 } }
{ id: "greater", name: "Greater", kind: "modifier", modifier: { type: "amplify", amount: 3 } }
{ id: "fire",    name: "Fire",    kind: "ink", element: "fire",
  effects: [{ kind: "applyStatus", status: "burn", stacks: 2 }] }
{ id: "erase",   name: "Erase",   kind: "edit", edit: "erase" }
```

Rivals are data too: `{ id, name, maxHp, behaviour: "rotation" | "weighted", spells: [{ words: ["fire", "strike"], weight? }] }`.

Effects: `damage`, `heal`, `shield`, `applyStatus`, `draw`. Keep this vocabulary small and composable, so that synergies emerge from combinations.

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
