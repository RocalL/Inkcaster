# TODO

Deferred work that isn't tracked in the roadmap. Each item says where it came from.

- **Balance (archetype playtest):** the greedy bot wins 77-100% with every loadout; rivals are probably too soft for it, and it plays better than a person. Retune after the playtest; `npm run sim` prints the matrix. (Phase 3)
- **Triggers (Phase 3):** `events.ts` only emits events. Reactive words ("when hit...") need a subscriber mechanism. (Phase 1)
- **Rewrite (Phase 5):** upgrading words (e.g. Strike II) instead of spells. Decide the shape when the Scriptorium starts. (Phase 2)
- **Bot quality:** `greedyBot` is deliberately simple. It looks one round ahead; Phase 8 balance sims will need deeper lookahead (saving words, timing Erase). (Phase 1)
- **Word order (idea):** v0 ignores order. Consider position rules (first or last word emphasised) if spells need more depth. (Phase 2)
- **Sequenced feedback:** the rival's turn resolves instantly after yours. Floaters are staggered, but a short pause between the two turns may read better. (Phase 2)
- **Long word text:** summon words read long on small pages ("Summon a Wisp (1 damage each turn, 2 turns)"). Consider icons or tooltips in Phase 7. (Phase 3)
- **Rival familiars vs your wards:** familiar hits consume wards one hit at a time, which makes wards weak against Inkling Mother. Watch this in the playtest. (Phase 3)
