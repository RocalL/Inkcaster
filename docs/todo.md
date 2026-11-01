# TODO

Deferred work that isn't tracked in the roadmap. Each item says where it came from.

- **Balance (archetype playtest):** the greedy bot wins 77-100% with every loadout; rivals are probably too soft for it, and it plays better than a person. Retune after the playtest; `npm run sim` prints the matrix. (Phase 3)
- **Triggers (Phase 3):** `events.ts` only emits events. Reactive words ("when hit...") need a subscriber mechanism. (Phase 1)
- **Bot quality:** `greedyBot` is deliberately simple. It looks one round ahead; Phase 8 balance sims will need deeper lookahead (saving words, timing Erase). (Phase 1)
- **Word order (idea):** v0 ignores order. Consider position rules (first or last word emphasised) if spells need more depth. (Phase 2)
- **Sequenced feedback:** the rival's turn resolves instantly after yours. Floaters are staggered, but a short pause between the two turns may read better. (Phase 2)
- **Long word text:** summon words read long on small pages ("Summon a Wisp (1 damage each turn, 2 turns)"). Consider icons or tooltips in Phase 7. (Phase 3)
- **Rival familiars vs your wards:** familiar hits consume wards one hit at a time, which makes wards weak against Inkling Mother. Watch this in the playtest. (Phase 3)
- **Run balance (playtest):** the bot wins about 74% of runs as Warden and 58% as Cryomancer, but only 11-22% with the other decks. Defensive decks dominate when HP carries over. Revisit with Bindings and the economy pass in Phase 5. (Phase 4)
- **Reload mid-duel:** the run is saved between duels only; reloading during a duel restarts that floor's duel (same seed). Fine for now; saving duel state would need a save-format bump. (Phase 4/5)
- **Reward variety:** the reward pool is one flat list. Consider biasing offers toward the run's archetype, and adding a "remove a word" reward. (Phase 4)
- **Verify saving in a real browser:** headless Chrome's IndexedDB never answers (the game falls back to no-save mode, as designed). Check a reload keeps gold and unlocks in Chrome and Firefox. (Phase 5)
- **Reset profile:** add a "reset progress" option in settings (Phase 7). (Phase 5)
- **Ascension is soft for the bot:** in `--progression` the bot reaches A5 by run ~12 and still wins 60-95% there, owning most of the Scriptorium. It plays better than a person; check with players and retune in Phase 8. (Phase 6)
- **Mixed Erase + Redact in one spell:** erase targets are matched to edit words in selection order, but the UI records targets in click order. Rare (it needs two edit words); make the UI pair them explicitly if it comes up. (Phase 6)
- **Scriptorium length:** 20 bindings and 60 words make long lists; consider filters or grouping in Phase 7. (Phase 6)
