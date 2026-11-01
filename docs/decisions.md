# Decisions

## Open

- [ ] Final combat mode: semi-real-time (default) vs. turn-based
- [ ] Linear path vs. branching map (duel / elite / shop / rest) for runs
- [ ] Art approach: flat icons + particles, or hand-drawn
- [ ] Domain and name availability (inkcaster.com / .io / .gg, itch.io, Steam)

## Log

| Date       | Decision                                                                                                                     | Reason                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| —          | Project named **Inkcaster**                                                                                                  | Fits the ink/spell/rewrite theme                                                |
| 2026-11-01 | Node 22 LTS via nvm, npm as package manager                                                                                  | Simple, matches the spec commands                                               |
| 2026-11-01 | Deploy to GitHub Pages via GitHub Actions                                                                                    | No extra account; itch.io can be added for release                              |
| 2026-11-01 | Spec split into CLAUDE.md + docs/ (design, roadmap, decisions, todo)                                                         | Keeps the always-loaded rules short                                             |
| 2026-11-01 | oxlint instead of ESLint; TypeScript 7 (current Vite template)                                                               | typescript-eslint only supports TS < 6.1; oxlint covers the engine purity rules |
| 2026-11-01 | `noUncheckedIndexedAccess` on top of `strict`                                                                                | Hand/pile/minion arrays: forces handling of empty slots                         |
| 2026-11-01 | Card cycle: casting discards the page and empties its slot for the spell cooldown, then the slot draws the next page         | Cheap/fast spells cycle the grimoire faster; gives `draw` a clear meaning       |
| 2026-11-01 | `draw N` instantly refills up to N empty slots, closest-to-ready first                                                       | Composable with the slot cycle                                                  |
| 2026-11-01 | Rival inkcasters are data-defined patterns (rotation / seeded weighted) with telegraphed cast bars; player casts are instant | Readable telegraphs, easy to design and balance                                 |
| 2026-11-01 | Ink is an integer plus tick progress (`ticksPerInk`); shields persist until consumed                                         | No float drift; simple rules to start, revisit in Phase 3                       |
| 2026-11-01 | `step()` clones state by hand (`cloneState`) instead of `structuredClone`                                                    | 40x faster bot sims (28s to 0.7s for 2,000 fights)                              |
