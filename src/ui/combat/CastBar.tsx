import { TICKS_PER_SECOND, type CombatContent, type EnemyState } from '../../engine/index.ts'
import { describeEffects, formatSeconds } from '../text.ts'

/** Damage at or above this is telegraphed as a heavy hit. */
const HEAVY_DAMAGE = 10

export function CastBar({ enemy, content }: { enemy: EnemyState; content: CombatContent }) {
  const cast = enemy.cast
  const spell = cast ? content.enemy.spells[cast.spellIndex] : undefined
  if (!cast || !spell) {
    return (
      <div className="cast-bar cast-bar-idle" aria-live="polite">
        <span className="cast-name">Gathering ink…</span>
      </div>
    )
  }

  const progress = 1 - cast.remainingTicks / cast.totalTicks
  const heavy = spell.effects.some(
    (effect) => effect.kind === 'damage' && effect.amount >= HEAVY_DAMAGE,
  )
  return (
    <div className={`cast-bar${heavy ? ' cast-bar-heavy' : ''}`} aria-live="polite">
      <div className="cast-fill" style={{ width: `${progress * 100}%` }} />
      <span className="cast-name">{spell.name}</span>
      <span className="cast-effect">{describeEffects(spell.effects)}</span>
      <span className="cast-time">{formatSeconds(cast.remainingTicks, TICKS_PER_SECOND)}s</span>
    </div>
  )
}
