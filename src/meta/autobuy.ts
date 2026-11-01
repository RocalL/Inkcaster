// A simple spending policy for the progression sim: buy the first affordable item from a fixed
// priority list until nothing more is affordable. Deterministic; not used by the UI.

import { LOADOUTS, REWARD_POOL } from '../data/index.ts'
import { BINDINGS } from '../data/scriptorium.ts'
import { buy, priceOf, type Profile, type Purchase } from './profile.ts'

const PRIORITY: readonly Purchase[] = [
  { type: 'binding', id: 'vellum_skin' },
  { type: 'binding', id: 'mending_thread' },
  { type: 'rewrite', id: 'strike' },
  { type: 'rewrite', id: 'ward' },
  { type: 'loadout', id: 'warden' },
  { type: 'binding', id: 'warded_cover' },
  { type: 'rewrite', id: 'greater' },
  { type: 'rewrite', id: 'drain' },
  { type: 'binding', id: 'gilded_margins' },
  ...LOADOUTS.map((loadout): Purchase => ({ type: 'loadout', id: loadout.id })),
  ...REWARD_POOL.map((reward): Purchase => ({ type: 'rewrite', id: reward.wordId })),
  ...BINDINGS.map((binding): Purchase => ({ type: 'binding', id: binding.id })),
  ...REWARD_POOL.map((reward): Purchase => ({ type: 'word', id: reward.wordId })),
]

export function autoSpend(profile: Profile): Profile {
  let current = profile
  for (;;) {
    const next = PRIORITY.find((purchase) => {
      const price = priceOf(current, purchase)
      return price !== null && price <= current.gold
    })
    if (!next) return current
    current = buy(current, next)
  }
}

/** Loadouts in the order the sim prefers them (strongest in run sims first). */
const LOADOUT_PREFERENCE = ['warden', 'cryomancer', 'apprentice', 'pyromancer', 'summoner']

/** The loadout the sim plays: its favourite among the unlocked ones. */
export function autoLoadout(profile: Profile): string {
  return (
    LOADOUT_PREFERENCE.find((id) => profile.unlockedLoadouts.includes(id)) ??
    profile.selectedLoadout
  )
}
