import type { Combatant, Side } from '../../engine/index.ts'
import { FLOATER_LIFETIME_MS, useCombatStore, type Floater } from './store.ts'

interface Props {
  side: Side
  name: string
  combatant: Combatant
}

export function CombatantPanel({ side, name, combatant }: Props) {
  const { hp, maxHp, shield } = combatant
  return (
    <div className={`combatant combatant-${side}`}>
      <div className="combatant-header">
        <span className="combatant-name">{name}</span>
        {shield > 0 && (
          <span className="shield-badge" aria-label={`${shield} shield`}>
            ◈ {shield}
          </span>
        )}
      </div>
      <div
        className="health-bar"
        role="meter"
        aria-label={`${name} health`}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
      >
        <div className="health-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
        {shield > 0 && (
          <div
            className="health-shield"
            style={{ width: `${Math.min(1, shield / maxHp) * 100}%` }}
          />
        )}
        <span className="health-text">
          {hp} / {maxHp}
        </span>
      </div>
      <Floaters side={side} />
    </div>
  )
}

function Floaters({ side }: { side: Side }) {
  const floaters = useCombatStore((store) => store.floaters)
  const mine = floaters.filter((floater) => floater.side === side)
  return (
    <div className="floaters" aria-hidden="true">
      {mine.map((floater, index) => (
        <span
          key={floater.id}
          className={`floater floater-${floater.kind}`}
          style={{
            left: `${50 + ((index % 3) - 1) * 18}%`,
            animationDuration: `${FLOATER_LIFETIME_MS}ms`,
          }}
        >
          {floaterText(floater)}
        </span>
      ))}
    </div>
  )
}

function floaterText({ kind, amount }: Floater): string {
  switch (kind) {
    case 'damage':
      return `-${amount}`
    case 'blocked':
      return `◈${amount}`
    case 'heal':
      return `+${amount}`
    case 'shield':
      return `+◈${amount}`
  }
}
