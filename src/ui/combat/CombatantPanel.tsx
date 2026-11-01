import type { Fighter, Side, StatusId } from '../../engine/index.ts'
import { STATUS_NAMES, STATUS_RULES } from '../text.ts'
import { useDuelStore, type Floater } from './store.ts'

/** Delay between consecutive floating numbers of one action. */
const FLOATER_STAGGER_MS = 220

const STATUS_ICONS: Record<StatusId, string> = {
  burn: '🜂',
  chill: '❄',
  focus: '✦',
  thorns: '❦',
  regen: '❧',
}

interface Props {
  side: Side
  name: string
  fighter: Fighter
}

export function CombatantPanel({ side, name, fighter }: Props) {
  const { hp, maxHp, ward, statuses, minions, echo } = fighter
  const active = (Object.keys(statuses) as StatusId[]).filter((status) => statuses[status] > 0)
  return (
    <div className={`combatant combatant-${side}`}>
      <div className="combatant-header">
        <span className="combatant-name">{name}</span>
        {ward > 0 && (
          <span className="badge badge-ward" title="Absorbs the next hit, then fades">
            ◈ Ward {ward}
          </span>
        )}
        {active.map((status) => (
          <span key={status} className={`badge badge-${status}`} title={STATUS_RULES[status]}>
            {STATUS_ICONS[status]} {STATUS_NAMES[status]} {statuses[status]}
          </span>
        ))}
        {echo && (
          <span
            className="badge badge-echo"
            title="This spell is cast again at the start of the next turn"
          >
            ↻ Echo
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
        <span className="health-text">
          {hp} / {maxHp}
        </span>
      </div>
      {minions.length > 0 && (
        <ul className="minions" aria-label={`${name}'s familiars`}>
          {minions.map((minion) => (
            <li
              key={minion.uid}
              className="minion"
              title={`Strikes for ${minion.attack} at the end of its owner's turn`}
            >
              <span className="minion-name">{minion.name}</span>
              <span className="minion-stats">
                ⚔ {minion.attack} · {minion.turnsLeft} turn{minion.turnsLeft === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Floaters side={side} />
    </div>
  )
}

function Floaters({ side }: { side: Side }) {
  const floaters = useDuelStore((store) => store.floaters)
  const mine = floaters.filter((floater) => floater.side === side)
  return (
    <div className="floaters" aria-hidden="true">
      {mine.map((floater, index) => (
        <span
          key={floater.id}
          className={`floater floater-${floater.kind}`}
          style={{
            left: `${50 + ((index % 3) - 1) * 16}%`,
            animationDelay: `${floater.order * FLOATER_STAGGER_MS}ms`,
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
    case 'burn':
      return `-${amount}🜂`
    case 'warded':
      return `◈${amount}`
    case 'heal':
      return `+${amount}`
    case 'ward':
      return `+◈${amount}`
  }
}
