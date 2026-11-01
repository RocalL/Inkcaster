// Ascension: harder runs, unlocked one by one by winning at the previous level.
// Each level includes all the ones below it, and pays more gold.

export interface AscensionLevel {
  level: number
  name: string
  description: string
}

/** The numbers behind the levels (applied in meta/profile.ts runContentFor). */
export const ASCENSION_RULES = {
  rivalHp: 0.15, // A1+
  healAfterWin: -0.15, // A2+
  bossHp: 0.3, // A3+
  rewardChoices: -1, // A4+
  rivalWard: 6, // A5
}

export const ASCENSIONS: readonly AscensionLevel[] = [
  { level: 1, name: 'Sharper Rivals', description: 'Rivals have 15% more HP' },
  { level: 2, name: 'Thin Bandages', description: 'Heal 15% less after each win' },
  { level: 3, name: 'Crowned Boss', description: 'The boss has 30% more HP' },
  { level: 4, name: 'Sparse Shelves', description: 'One fewer word offered after each win' },
  { level: 5, name: 'Warded Rivals', description: 'Rivals start each duel with Ward 6' },
]

export const MAX_ASCENSION = ASCENSIONS.length

/** Extra gold per ascension level. */
export const ASCENSION_GOLD_BONUS = 0.1
