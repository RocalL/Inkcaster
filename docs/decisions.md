# Decisions

## Open

- [ ] Linear path vs. branching map (duel / elite / shop / rest) for runs
- [ ] Art approach: flat icons + particles, or hand-drawn
- [ ] Domain and name availability (inkcaster.com / .io / .gg, itch.io, Steam)

## Log

| Date       | Decision                                                                                                                           | Reason                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| —          | Project named **Inkcaster**                                                                                                        | Fits the ink/spell/rewrite theme                                                                                            |
| 2026-11-01 | Node 22 LTS via nvm, npm as package manager                                                                                        | Simple, matches the spec commands                                                                                           |
| 2026-11-01 | Deploy to GitHub Pages via GitHub Actions                                                                                          | No extra account; itch.io can be added for release                                                                          |
| 2026-11-01 | Spec split into CLAUDE.md + docs/ (design, roadmap, decisions, todo)                                                               | Keeps the always-loaded rules short                                                                                         |
| 2026-11-01 | oxlint instead of ESLint; TypeScript 7 (current Vite template)                                                                     | typescript-eslint only supports TS < 6.1; oxlint covers the engine purity rules                                             |
| 2026-11-01 | `noUncheckedIndexedAccess` on top of `strict`                                                                                      | Hand/pile/minion arrays: forces handling of empty slots                                                                     |
| 2026-11-01 | ~~Card cycle: casting empties its slot for the spell cooldown~~ (superseded by timeline turns)                                     | Cheap/fast spells cycle the grimoire faster; gives `draw` a clear meaning                                                   |
| 2026-11-01 | ~~`draw N` refills empty slots~~ (superseded: draw adds pages up to 7)                                                             | Composable with the slot cycle                                                                                              |
| 2026-11-01 | Rival inkcasters are data-defined patterns (rotation / seeded weighted) with telegraphed cast bars; player casts are instant       | Readable telegraphs, easy to design and balance                                                                             |
| 2026-11-01 | Ink is an integer plus tick progress (`ticksPerInk`)                                                                               | No float drift; simple rules to start, revisit in Phase 3                                                                   |
| 2026-11-01 | UI: a Zustand store owns the real-time clock (`advanceClock`) and the queued commands; components only read state and call actions | Keeps all rules in the engine; the store's loop is unit-tested without a DOM                                                |
| 2026-11-01 | ~~Casting disabled while paused~~ (superseded: no pause needed)                                                                    | Simplest accessible pause; to revisit after the playtest                                                                    |
| 2026-11-01 | **Combat mode: timeline turns** (replaces semi-real-time). Time freezes on the player's turn; pages cost ink and time              | Playtest 1: real time was a click-speed race with no decisions. Tempo through time, unlike Slay the Spire's per-turn energy |
| 2026-11-01 | A cast page is replaced immediately (no slot recharge); hand 5, `draw` up to 7                                                     | Holding pages is free, so choosing matters                                                                                  |
| 2026-11-01 | Wards absorb only the next hit, then vanish (both sides)                                                                           | Timing decisions on the timeline; stops pre-stacking shields                                                                |
| 2026-11-01 | Ink regen 0.8/s of timeline                                                                                                        | Bot sims: about 96% / 82% wins vs the two rivals, ending around 18/50 HP                                                    |
| 2026-11-01 | `step()` clones state by hand (`cloneState`) instead of `structuredClone`                                                          | 40x faster bot sims (28s to 0.7s for 2,000 fights)                                                                          |
