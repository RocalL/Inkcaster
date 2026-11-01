# TODO

Deferred work that isn't tracked in the roadmap. Each item says where it came from.

- **Balance (playtest 3):** spellwriting pass. Bot wins about 87% vs Ash Adept and 94% vs Frost Scribe, ending around 19/50 HP. Retune after the human playtest. (Phase 2)
- **Minions / enchantments (Phase 3):** decide how summon and lasting words fit spellwriting before building them. (Phase 2)
- **Triggers (Phase 3):** `events.ts` only emits events. Reactive words ("when hit...") need a subscriber mechanism. (Phase 1)
- **Rewrite (Phase 5):** upgrading words (e.g. Strike II) instead of spells. Decide the shape when the Scriptorium starts. (Phase 2)
- **Bot quality:** `greedyBot` is deliberately simple. It looks one round ahead; Phase 8 balance sims will need deeper lookahead (saving words, timing Erase). (Phase 1)
- **Word order (idea):** v0 ignores order. Consider position rules (first or last word emphasised) if spells need more depth. (Phase 2)
- **Sequenced feedback:** the rival's turn resolves instantly after yours. Floaters are staggered, but a short pause between the two turns may read better. (Phase 2)
