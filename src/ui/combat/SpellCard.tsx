import { useRef, useState, type PointerEvent } from 'react'
import type { SpellDef } from '../../engine/index.ts'
import { describeEffects } from '../text.ts'

/** Dragging a card at least this far up casts it. */
const CAST_DRAG_PX = 60
/** Below this distance a press counts as a click. */
const CLICK_SLOP_PX = 8

interface Props {
  index: number
  spell: SpellDef
  affordable: boolean
  disabled: boolean
  /** Timeline hint, e.g. which rival spell lands before your next turn. */
  hint: { text: string; tone: 'warning' | 'info' } | null
  /** Changes every time a cast from this slot is rejected. */
  shakeKey: number | null
  onCast: () => void
  onPreview: (active: boolean) => void
}

export function SpellCard({
  index,
  spell,
  affordable,
  disabled,
  hint,
  shakeKey,
  onCast,
  onPreview,
}: Props) {
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return
    setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y })
  }
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    drag.current = null
    setOffset({ x: 0, y: 0 })
    if (Math.hypot(dx, dy) < CLICK_SLOP_PX || dy < -CAST_DRAG_PX) onCast()
  }
  const onPointerCancel = () => {
    drag.current = null
    setOffset({ x: 0, y: 0 })
  }

  const dragging = offset.x !== 0 || offset.y !== 0
  const classes = [
    'spell-card',
    `element-${spell.tags[0] ?? 'neutral'}`,
    affordable ? '' : 'unaffordable',
    dragging ? 'dragging' : '',
    dragging && offset.y < -CAST_DRAG_PX ? 'armed' : '',
    // Remounted via `key` on every rejection, which replays the animation.
    shakeKey !== null ? 'shake' : '',
  ]

  return (
    <button
      key={shakeKey ?? undefined}
      type="button"
      className={classes.filter(Boolean).join(' ')}
      disabled={disabled}
      style={dragging ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
      aria-label={`${spell.name}, ${spell.cost} ink, ${spell.time} seconds: ${describeEffects(spell.effects)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={() => onPreview(true)}
      onPointerLeave={() => onPreview(false)}
      onFocus={() => onPreview(true)}
      onBlur={() => onPreview(false)}
      onClick={(event) => {
        // Pointer casting is handled above; detail 0 means keyboard activation.
        if (event.detail === 0) onCast()
      }}
    >
      <span className="spell-cost">{spell.cost}</span>
      <span className="spell-name">{spell.name}</span>
      <span className="spell-type">{spell.type}</span>
      <span className="spell-text">{describeEffects(spell.effects)}</span>
      <span className="spell-time">⧗ {spell.time}s</span>
      {hint && <span className={`spell-hint hint-${hint.tone}`}>{hint.text}</span>}
      <span className="key-hint">{index + 1}</span>
    </button>
  )
}
