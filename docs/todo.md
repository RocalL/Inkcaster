# TODO

Deferred work that isn't tracked in the roadmap. Each item says where it came from.

- **Balance (Phase 2 playtest):** the greedy bot wins 100% against both starter enemies, so enemies are too weak. Tune in Phase 2 once a human has played it. (Phase 1)
- **Triggers (Phase 3):** `events.ts` only emits events. `onPlay` / `onTick` / `onDeath` / `onHit` triggers need a subscriber mechanism in the engine. (Phase 1)
- **Spell upgrades (Phase 5):** `SpellDef` has no `upgrades` field yet (see design.md card shape). Add it with Rewrite. (Phase 1)
- **Bot quality:** `greedyBot` is deliberately simple. Phase 8 balance sims will need a smarter policy (ink saving, counters). (Phase 1)
