# Decisions

## Open

- [ ] Final combat mode: semi-real-time (default) vs. turn-based
- [ ] Linear path vs. branching map (duel / elite / shop / rest) for runs
- [ ] Art approach: flat icons + particles, or hand-drawn
- [ ] Domain and name availability (inkcaster.com / .io / .gg, itch.io, Steam)

## Log

| Date       | Decision                                                             | Reason                                                                          |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| —          | Project named **Inkcaster**                                          | Fits the ink/spell/rewrite theme                                                |
| 2026-11-01 | Node 22 LTS via nvm, npm as package manager                          | Simple, matches the spec commands                                               |
| 2026-11-01 | Deploy to GitHub Pages via GitHub Actions                            | No extra account; itch.io can be added for release                              |
| 2026-11-01 | Spec split into CLAUDE.md + docs/ (design, roadmap, decisions, todo) | Keeps the always-loaded rules short                                             |
| 2026-11-01 | oxlint instead of ESLint; TypeScript 7 (current Vite template)       | typescript-eslint only supports TS < 6.1; oxlint covers the engine purity rules |
| 2026-11-01 | `noUncheckedIndexedAccess` on top of `strict`                        | Hand/pile/minion arrays: forces handling of empty slots                         |
