# Roadmap

Work on **one phase at a time**. Do not start a phase until the previous one meets its "done when". Tick a phase here when it is complete, and update "Current phase" in `CLAUDE.md`.

| Done | Phase                          | Goal                                                                                                                    | Done when                                                                   |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [x]  | 0. Foundations                 | Vite + TS + React + Vitest, lint, CI, deploy-on-push                                                                    | "Hello world" live on a public URL                                          |
| [x]  | 1. Combat engine (no graphics) | Tick loop, ink regen, hand/draw/discard/cooldown, effects (`damage`, `shield`, `heal`, `draw`), enemy AI, debug harness | A full duel runs in tests; a bot plays 1,000 seeded fights without crashing |
| [ ]  | 2. Playable combat UI          | Spellwriting duel: hand of words, writing desk, rival intent, erase, statuses                                           | One duel with 10-12 placeholder spells is **fun** (stop and playtest here)  |
| [ ]  | 3. Spell depth                 | Statuses, minions, enchantments, counters, tag synergies, ~30 spells                                                    | 5 archetypes feel distinct                                                  |
| [ ]  | 4. Run structure               | 6-8 duel chain, boss, reward choice (1 of 3), gold, death screen                                                        | A full run can be played start to finish                                    |
| [ ]  | 5. Scriptorium                 | Save/load, Grimoire, Rewrite, Bindings, Loadouts, economy pass                                                          | Die, spend gold, feel stronger next run                                     |
| [ ]  | 6. Content                     | 8-10 enemies + 2-3 bosses, 60-80 spells, 20+ bindings, ascension mode                                                   | Content targets reached                                                     |
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
- [ ] **Playtest 3: is writing spells fun?** This is the "done when"; stop here
