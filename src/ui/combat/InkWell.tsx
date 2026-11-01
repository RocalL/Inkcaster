import type { PlayerState } from '../../engine/index.ts'

export function InkWell({ player }: { player: PlayerState }) {
  const { ink, maxInk, inkProgress, ticksPerInk } = player
  const filling = ink < maxInk ? inkProgress / ticksPerInk : 0
  return (
    <div
      className="inkwell"
      role="meter"
      aria-label="Ink"
      aria-valuemin={0}
      aria-valuemax={maxInk}
      aria-valuenow={ink}
    >
      <span className="inkwell-label">
        Ink <strong>{ink}</strong>/{maxInk}
      </span>
      <div className="inkwell-pips">
        {Array.from({ length: maxInk }, (_, i) => {
          const fill = i < ink ? 1 : i === ink ? filling : 0
          return (
            <span key={i} className="ink-pip">
              <span className="ink-pip-fill" style={{ height: `${fill * 100}%` }} />
            </span>
          )
        })}
      </div>
    </div>
  )
}
