import {
  TICKS_PER_SECOND,
  durationTicks,
  forecastEnemy,
  getSpell,
  isPlayerTurn,
  type CombatContent,
  type CombatState,
} from '../../engine/index.ts'
import { summarizeEffects } from '../text.ts'
import { useCombatStore } from './store.ts'

/** Seconds of future shown on the strip. */
const HORIZON_SECONDS = 6

interface Props {
  state: CombatState
  content: CombatContent
}

export function Timeline({ state, content }: Props) {
  const preview = useCombatStore((store) => store.preview)
  const horizon = HORIZON_SECONDS * TICKS_PER_SECOND
  const position = (tick: number) => `${(Math.min(tick - state.tick, horizon) / horizon) * 100}%`
  const yourTurn = isPlayerTurn(state)

  const previewCard = preview === null ? undefined : state.player.hand[preview]
  const previewTick = previewCard
    ? state.tick + durationTicks(getSpell(content, previewCard.spellId).time)
    : null

  return (
    <div className="timeline" aria-label="Timeline">
      <div className="timeline-track">
        {forecastEnemy(content, state).map((action, index) => {
          const spell = content.enemy.spells.find((candidate) => candidate.id === action.spellId)
          if (action.landsAt === null || !spell) {
            return (
              <span
                key={index}
                className="timeline-marker timeline-unknown"
                style={{ left: position(action.startsAt) }}
              >
                <span className="timeline-label">?</span>
              </span>
            )
          }
          const harmful = spell.effects.some((effect) => effect.kind === 'damage')
          const startsIn = Math.max(action.startsAt, state.tick)
          return (
            <span key={index}>
              <span
                className="timeline-cast"
                style={{
                  left: position(startsIn),
                  width: `calc(${position(action.landsAt)} - ${position(startsIn)})`,
                }}
              />
              <span
                className={`timeline-marker timeline-enemy${harmful ? ' harmful' : ''}`}
                style={{ left: position(action.landsAt) }}
              >
                <span className="timeline-label">
                  {spell.name}
                  <small>{summarizeEffects(spell.effects)}</small>
                </span>
              </span>
            </span>
          )
        })}

        {!yourTurn && (
          <span
            className="timeline-marker timeline-you"
            style={{ left: position(state.player.readyAt) }}
          >
            <span className="timeline-label">You</span>
          </span>
        )}
        {yourTurn && previewTick !== null && (
          <span
            className="timeline-marker timeline-you timeline-ghost"
            style={{ left: position(previewTick) }}
          >
            <span className="timeline-label">Your next turn</span>
          </span>
        )}
        <span className="timeline-now" />
      </div>
      <div className="timeline-scale" aria-hidden="true">
        {Array.from({ length: HORIZON_SECONDS + 1 }, (_, second) => (
          <span key={second} style={{ left: `${(second / HORIZON_SECONDS) * 100}%` }}>
            {second === 0 ? 'now' : `${second}s`}
          </span>
        ))}
      </div>
    </div>
  )
}
