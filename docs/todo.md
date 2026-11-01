# TODO

Deferred work that isn't tracked in the roadmap. Each item says where it came from.

- **Balance (Phase 2 playtest 2):** timeline-turns pass. Bot wins about 96% vs Ash Adept (about 60s) and 82% vs Frost Scribe (about 44s), ending around 18/50 HP. Retune after the next human playtest. (Phase 2)
- **Minion slots (Phase 3):** listed in Phase 2 but not drawn, because the engine has no minions yet. Add them to the combat screen alongside `summon`. (Phase 2)
- **Triggers (Phase 3):** `events.ts` only emits events. `onPlay` / `onTick` / `onDeath` / `onHit` triggers need a subscriber mechanism in the engine. (Phase 1)
- **Spell upgrades (Phase 5):** `SpellDef` has no `upgrades` field yet (see design.md card shape). Add it with Rewrite. (Phase 1)
- **Bot quality:** `greedyBot` is deliberately simple. Phase 8 balance sims will need a smarter policy (ink saving, counters). (Phase 1)
- **Timeline UI polish:** show your own marker at "now" on your turn; draw-in animation for replaced pages; mobile layout of a 5-7 page hand. (Phase 2)
