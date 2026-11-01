# Inkcaster — working rules for Claude Code

Solo, browser-based roguelite deckbuilder with die-and-retry meta-progression. You play an inkcaster whose spells are written on the pages of a grimoire.

- Full game design: [docs/design.md](docs/design.md)
- Roadmap and current phase: [docs/roadmap.md](docs/roadmap.md)
- Decisions (open and settled): [docs/decisions.md](docs/decisions.md)
- Deferred work: [docs/todo.md](docs/todo.md)

**Current phase: 2 — Playable combat UI (spellwriting v0 built; waiting for playtest 3).** Read the roadmap entry for this phase before starting work. Do not start a phase until the previous one meets its "done when".

## Commands

```
npm run dev        # Vite dev server
npm run build      # typecheck + production build (dist/)
npm run test       # Vitest (run once)
npm run lint       # oxlint + tsc -b (typecheck)
npm run format     # Prettier write (CI runs format:check)
npm run sim        # headless bot sim: 1,000 seeded duels per rival, win rates
npm run sim -- --enemy ash_adept --seed 3 --log   # debug harness: one duel, round by round
```

Playtest shortcut: `http://localhost:5173/Inkcaster/?duel=ash_adept&seed=3` opens a duel directly.

`scripts/` runs directly with Node's type stripping, so imports use explicit `.ts` extensions everywhere.

Node 22 LTS via nvm (`.nvmrc`). Package manager: npm. Deploy: GitHub Actions to GitHub Pages on push to `main`.

## Architecture

```
src/
  engine/   Pure logic. NO React, NO DOM, NO Pixi imports. Never imports data/.
    types.ts    content definitions (WordDef, EnemyDef, PlayerSetup, Effect)
    state.ts    DuelState (plain data), createInitialState, cloneState
    spell.ts    composeSpell: words -> effects (verb, amplify, repeat, inks), applyChill
    duel.ts     createDuel, act (one player command + the rival turn), previews, runDuel
    effects.ts  effect resolver, wards, burn at start of turn
    hand.ts     discard, refill, draw, reshuffle
    events.ts   events emitted per action
    ai.ts       rival intent (rotation / seeded weighted)
    rng.ts      seeded RNG (state stored in DuelState)
    bot.ts      greedy player: tries every legal sentence with the real engine
  data/     Words, rivals, starter deck as data (imports engine types)
  meta/     Profile, gold, unlocks, save/load, migrations
  ui/       React screens: Menu, Scriptorium, Run, Duel, Rewards
    text.ts           player-facing wording for words/spells/events (pure; the sim log uses it too)
    combat/store.ts   Zustand store: current selection, erase targets, floaters, log
  vfx/      PixiJS layer behind the UI
  audio/    Howler.js wrappers
scripts/    Node CLI tools (sim)
tests/      Engine unit tests (own fixtures, not game data) + data checks + bot simulations
```

Engine model in one paragraph: duels are **spellwriting** turns (see docs/design.md). `act(content, state, command)` takes the player's `write` (hand indices, plus erase targets) or `discard`, resolves it, plays the whole rival turn, starts the player's next turn, and returns a new state plus events. Invalid commands return the same state and a `commandRejected` event. It clones the state with `cloneState`, so new nested state must be added there; a test feeds it frozen input to catch misses. `composeSpell` is the single place where words become effects; the UI previews spells and the rival intent through `previewSpell` / `previewIntent`.

## Non-negotiable rules

1. **The engine is pure and deterministic.** Same seed + same inputs = same result. Never use `Math.random()`, `Date.now()`, `performance.now()` or timers in `src/engine`. Use `rng.ts` and the tick counter. oxlint enforces this in `.oxlintrc.json`.
2. **The UI renders state and sends commands.** It never mutates engine state directly. No game logic in React components.
3. **Content is data, not code.** A new spell, enemy or passive is a new data entry. It needs a new code path only when it requires a new effect kind.
4. **The save format is versioned.** Every version bump comes with a migration function. Ask before changing the save format.
5. **Every effect kind has unit tests.**

Effect vocabulary (keep it small and composable): `damage`, `heal`, `shield`, `applyStatus`, `draw`. Word kinds: verb, modifier, ink, edit. The word data shape is in [docs/design.md](docs/design.md#word-data-shape).

## Vocabulary

Use these terms in code, UI and copy: card → **Word / Page**, composed card → **Spell**, deck → **Grimoire / Tome**, hub → **Scriptorium**, upgrade → **Rewrite**, passives → **Bindings**, enemies → **Rival inkcasters**.

## Conventions

- TypeScript strict. No `any` unless a comment justifies it.
- Engine: small pure functions, immutable updates.
- Files `kebab-case.ts`, React components `PascalCase.tsx`, data ids `snake_case`.
- Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`).
- Keep each change small and scoped to one roadmap item.
- Every engine change ships with tests. UI tests are optional early on.
- Never leave a TODO silently. Record it in `docs/todo.md`.
- Do not add heavy dependencies without asking. The approved stack is in [docs/design.md](docs/design.md#tech-stack).

## How to work

1. Plan before coding anything larger than a small fix: list the files you will touch and the tests you will add.
2. Engine first, UI second.
3. Ask before changing a design pillar, adding a major dependency or changing the save format.
4. Run `npm run lint` and `npm run test` after each change, and fix failures before moving on.
5. When a decision is made, record it in `docs/decisions.md`. When a phase is done, tick it in `docs/roadmap.md` and update **Current phase** above.
6. Prefer simple, readable code over clever code. This is a long-running solo project.
7. Commit only when asked. The user pushes over SSH.
