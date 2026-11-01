# Roadmap

Work on **one phase at a time**. Do not start a phase until the previous one meets its "done when". Tick a phase here when it is complete, and update "Current phase" in `CLAUDE.md`.

| Done | Phase                          | Goal                                                                                                                    | Done when                                                                   |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [x]  | 0. Foundations                 | Vite + TS + React + Vitest, lint, CI, deploy-on-push                                                                    | "Hello world" live on a public URL                                          |
| [x]  | 1. Combat engine (no graphics) | Tick loop, ink regen, hand/draw/discard/cooldown, effects (`damage`, `shield`, `heal`, `draw`), enemy AI, debug harness | A full duel runs in tests; a bot plays 1,000 seeded fights without crashing |
| [ ]  | 2. Playable combat UI          | Hand, ink bar, health bars, cast bars, minion slots, telegraphs, click/drag casting, pause/slow                         | One duel with 10-12 placeholder spells is **fun** (stop and playtest here)  |
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
