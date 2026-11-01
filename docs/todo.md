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
- **Run balance (playtest):** the bot wins about 74% of runs as Warden and 58% as Cryomancer, but only 11-22% with the other decks. Defensive decks dominate when HP carries over. Revisit with Bindings and the economy pass in Phase 5. (Phase 4)
- **Reload mid-duel:** the run keeps the duel seed, so re-entering restarts that floor's duel from the start. Phase 5 save/load should keep this behaviour or save duel state too. (Phase 4)
- **Reward variety:** the reward pool is one flat list. Consider biasing offers toward the run's archetype, and adding a "remove a word" reward. (Phase 4)
- **Rival variety:** with 4 regular rivals a path still meets some twice. Phase 6 adds more. (Phase 4)
