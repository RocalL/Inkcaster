import {
  durationTicks,
  forecastEnemy,
  getSpell,
  isPlayerTurn,
  type CombatContent,
  type CombatState,
  type SpellDef,
} from '../../engine/index.ts'
import { SpellCard } from './SpellCard.tsx'
import { useCombatStore } from './store.ts'

interface Props {
  state: CombatState
  content: CombatContent
}

export function Hand({ state, content }: Props) {
  const cast = useCombatStore((store) => store.cast)
  const setPreview = useCombatStore((store) => store.setPreview)
  const rejection = useCombatStore((store) => store.rejection)
  const yourTurn = isPlayerTurn(state)
  const forecast = forecastEnemy(content, state)

  /** Rival spells that deal damage, with when they land. */
  const hits = forecast.flatMap((action) => {
    const spell = content.enemy.spells.find((candidate) => candidate.id === action.spellId)
    const damage = spell?.effects.reduce(
      (sum, effect) => (effect.kind === 'damage' ? sum + effect.amount : sum),
      0,
    )
    return spell && damage && action.landsAt !== null
      ? [{ name: spell.name, damage, landsAt: action.landsAt }]
      : []
  })

  const hintFor = (spell: SpellDef) => {
    if (spell.effects.some((effect) => effect.kind === 'shield')) {
      const next = hits[0]
      return next
        ? { text: `Next hit: ${next.name} (${next.damage})`, tone: 'info' as const }
        : null
    }
    const readyAt = state.tick + durationTicks(spell.time)
    const first = hits.find((hit) => hit.landsAt <= readyAt)
    return first ? { text: `⚠ ${first.name} lands first`, tone: 'warning' as const } : null
  }

  return (
    <div className="hand">
      {state.player.hand.map((card, index) => {
        const spell = getSpell(content, card.spellId)
        return (
          <SpellCard
            key={card.uid}
            index={index}
            spell={spell}
            affordable={spell.cost <= state.player.ink}
            disabled={!yourTurn}
            hint={yourTurn ? hintFor(spell) : null}
            shakeKey={rejection?.slot === index ? rejection.id : null}
            onCast={() => cast(index)}
            onPreview={(active) => setPreview(active ? index : null)}
          />
        )
      })}
    </div>
  )
}
