# Roadmap

Work on **one phase at a time**. Do not start a phase until the previous one meets its "done when". Tick a phase here when it is complete, and update "Current phase" in `CLAUDE.md`.

| Done | Phase                          | Goal                                                                                                                    | Done when                                                                   |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [x]  | 0. Foundations                 | Vite + TS + React + Vitest, lint, CI, deploy-on-push                                                                    | "Hello world" live on a public URL                                          |
| [x]  | 1. Combat engine (no graphics) | Tick loop, ink regen, hand/draw/discard/cooldown, effects (`damage`, `shield`, `heal`, `draw`), enemy AI, debug harness | A full duel runs in tests; a bot plays 1,000 seeded fights without crashing |
| [x]  | 2. Playable combat UI          | Spellwriting duel: hand of words, writing desk, rival intent, erase, statuses                                           | One duel with 10-12 placeholder spells is **fun** (stop and playtest here)  |
| [x]  | 3. Spell depth                 | Statuses, minions, enchantments, counters, tag synergies, ~30 spells                                                    | 5 archetypes feel distinct                                                  |
| [x]  | 4. Run structure               | 6-8 duel chain, boss, reward choice (1 of 3), gold, death screen                                                        | A full run can be played start to finish                                    |
| [x]  | 5. Scriptorium                 | Save/load, Grimoire, Rewrite, Bindings, Loadouts, economy pass                                                          | Die, spend gold, feel stronger next run                                     |
| [x]  | 6. Content                     | 8-10 enemies + 2-3 bosses, 60-80 spells, 20+ bindings, ascension mode                                                   | Content targets reached                                                     |
| [ ]  | 7. Polish                      | Art, VFX, audio, tutorial, glossary tooltips, settings, mobile/touch, 60 fps                                            | Feels juicy and onboardable                                                 |
| [ ]  | 8. Balance and release         | Bot balance sims, playtests, error logging, PWA, release page                                                           | Public release                                                              |

## Phase 0 checklist

- [x] Vite + React + TypeScript (strict) scaffold
- [x] Vitest, oxlint (with engine purity rules), Prettier
- [x] Folder structure from `CLAUDE.md`
- [x] npm scripts: dev, build, test, lint, format
- [x] GitHub Actions CI: lint + test + build on push and on PRs
- [x] GitHub Actions deploy to GitHub Pages on push to `main`
- [x] Hello world live at the public URL (https://rocall.github.io/Inkcaster/)

## Phase 1 checklist

- [x] `rng.ts`, `state.ts`, `sim.ts` (fixed tick loop), with tests
- [x] Effect resolver (`damage`, `shield`, `heal`, `draw`)
- [x] Draw/cooldown cycle and ink regen
- [x] Basic enemy AI with telegraphed casts (rotation, weighted)
- [x] 10 starter spells and 2 enemy inkcasters as data in `src/data`
- [x] `npm run sim`: a headless bot plays 1,000 seeded fights (also a test, and run in CI)
- [x] Debug harness: `npm run sim -- --log`

## Phase 2 checklist

- [x] Menu: choose a rival
- [x] Combat screen: enemy HP, shield and telegraphed cast bar (heavy hits pulse)
- [x] Player HP, shield and inkwell (pips fill continuously)
- [x] Hand: click, drag up, or keys 1-4 to cast; recharge sweep on empty slots; shake on a rejected cast
- [x] ~~Pause and slow time~~ (removed with timeline turns)
- [x] Floating numbers, combat log, win/lose overlay (pages burn / blur)
- [x] Playtest URL shortcut: `?duel=<enemy_id>&seed=<n>`
- [x] First balance pass with `npm run sim`
- [ ] Minion slots, deferred to Phase 3 (no minions in the engine yet)
- [x] Playtest 1: not fun. Real time was a click race with no reason to read pages. Pivoted to timeline turns
- [x] Timeline turns: engine (`readyAt`, `time` cost, `wait`), wards absorb only the next hit, `forecastEnemy`
- [x] Timeline strip, per-page hints ("lands first" / "next hit"), gather ink, fast time; pause and slow removed
- [x] Balance pass for timeline turns
- [x] Playtest 2: not fun; the timeline made it worse. The user chose "writing spells" as the core fun
- [x] Spellwriting v0 engine: words (verb / modifier / ink / edit), `composeSpell`, alternating turns, Burn and Chill, Erase on the rival's intent
- [x] Spellwriting UI: rival sentence with live preview, 3-slot writing desk, word pages, discard and pass, log, floaters
- [x] Balance pass: the bot wins about 87% vs Ash Adept and 94% vs Frost Scribe, in 9-12 rounds, ending around 19/50 HP
- [x] Playtest 3: writing spells is fun. Phase 2 done (2026-11-01)

## Phase 3 checklist

Translated to spellwriting: "spells" are now words; statuses, minions, lasting effects and counters are word mechanics.

- [x] Statuses: Burn (now halves each tick), Chill, Focus, Thorns (hit back, even through wards), Regen
- [x] Scaling damage: per target Burn / Chill (Shatter uses it up), per own ward, per word in the spell
- [x] Minions: Call / Spirit summon familiars that strike at the end of their owner's turn; Rally; max 4 per side
- [x] Counter: Blot cancels the rival's next spell (player only)
- [x] Lasting / combo modifiers: Echo (recast next turn), Verbose (+2 word slots), Thrice
- [x] 28 words, 6 loadouts (Apprentice + 5 archetypes), 4 rivals (Bramble Warden, Inkling Mother added)
- [x] Sim matrix: every loadout vs every rival (`npm run sim`)
- [x] UI: grimoire picker, familiars and status badges, Blot preview, 4th desk slot with Verbose
- [x] Playtest: the 5 archetypes feel distinct. Phase 3 done (2026-11-01)

## Phase 4 checklist

- [x] Engine `run.ts`: linear path (6 duels in rising tiers, then the boss), HP carried over with a 40% heal after each win, gold, rewards, death and victory; serializable state
- [x] Rival HP ramps per floor (x0.5 to x0.9); boss The Archivist (telegraphs Focus, then "Strike Thrice")
- [x] Rewards: pick 1 of 3 distinct words (rarity-weighted) or skip
- [x] Gold: 10 + 4 per floor per win, 60 for the boss; half kept on death (spent in Phase 5)
- [x] UI: Begin a run, run map, duel in run mode, reward screen, victory and death screens, abandon run
- [x] Sim: `npm run sim -- --runs` (win %, floors reached, where runs die); bot test plays 120 runs
- [x] Playtest: full runs work. Phase 4 done (2026-11-01)

## Phase 5 checklist

- [x] Profile (`src/meta/profile.ts`): gold, unlocked words and loadouts, rewrites, bindings, stats, run in progress
- [x] Start small: Apprentice + 10 core words; gold unlocks the rest
- [x] Grimoire: unlock words into the reward pool (25 / 40 / 70 by rarity)
- [x] Loadouts: unlock archetype grimoires (100, includes their words)
- [x] Rewrite: words tier I to III (+25% to numbers per tier; scaling words +2 base per tier); 30 / 60
- [x] Bindings: Vellum Skin, Warded Cover, Mending Thread, Gilded Margins, Wide Shelf, Deep Inkwell
- [x] Save: versioned (v1) in IndexedDB via idb-keyval, migration table, run saved between duels; plays without saving if storage fails or hangs
- [x] UI: Scriptorium (4 tabs), menu with gold, stats, locked grimoires, Resume run; tier marks on rewritten words
- [x] Economy pass: `npm run sim -- --progression` (bot run wins: 23% on run 1, about 50% by run 7, 80-88% from run 11)
- [x] Playtest: the meta loop works. Phase 5 done (2026-11-01). Saving in a real browser not yet verified (see todo)

## Phase 6 checklist

The "done when" is content targets, checked by `tests/data/data.test.ts`.

- [x] Words: 60 (target 60-80). New: Cinder, Conflagrate, Cinderwall, Frostbite, Rime, Golem, Swarm, Scribble, Ponder, Hymn, Aegis, Bastion, Retaliate, Thornlash, Bloom, Brand, Hex, Purge, Lance, Smite, Volley, Torrent, Leech; Intensify, Vampiric, Piercing; Storm, Shadow, Ash, Dawn, Stone; Redact
- [x] Statuses: 8 (target 8-10). New: Brand, Stain, Inspire
- [x] New mechanics: piercing damage, lifesteal, cleanse, Redact (strike any word), rivals' starting ward, starting statuses
- [x] Rivals: 9 + 3 bosses (target 8-10 + 2-3). New: Hex Weaver, Storm Caller, Blood Scribe, Golem Wright, The Censor; bosses The Pyre Queen and The Inquisitor; each run draws one boss
- [x] Bindings: 20 (target 20+)
- [x] Ascension: 5 levels, unlocked by winning; +10% gold per level
- [x] Save v2 with a v1 migration (ascension fields)
- [x] Sims: duel matrix (6 x 12), runs, progression climbing ascension
- [x] Content targets reached. Phase 6 done (2026-11-01). A quick playtest of the new words and rivals is recommended before Phase 7
