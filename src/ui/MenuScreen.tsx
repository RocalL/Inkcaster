import { ENEMIES } from '../data/index.ts'
import { useDuelStore } from './combat/store.ts'

export function MenuScreen() {
  const startDuel = useDuelStore((store) => store.startDuel)
  return (
    <main className="menu">
      <h1>Inkcaster</h1>
      <p className="tagline">Write your spells. Survive the duel. Rewrite yourself.</p>

      <h2>Choose a rival</h2>
      <ul className="rivals">
        {ENEMIES.map((enemy) => (
          <li key={enemy.id}>
            <button type="button" className="rival" onClick={() => startDuel(enemy.id)}>
              <span className="rival-name">{enemy.name}</span>
              <span className="rival-meta">
                {enemy.maxHp} HP · {enemy.behaviour === 'rotation' ? 'methodical' : 'unpredictable'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <details className="how-to">
        <summary>How to duel</summary>
        <ul>
          <li>
            Each turn, <strong>write one spell</strong> from your hand: exactly one{' '}
            <strong>verb</strong> (Strike, Ward, Mend, Drain) plus up to two more words.
          </li>
          <li>
            <strong>Modifiers</strong> reshape it: Greater adds +3, Twice casts it twice.{' '}
            <strong>Inks</strong> add an element: Fire burns, Ice chills, Arcane draws a word.
          </li>
          <li>
            The rival's next spell is written above it. Put <strong>Erase</strong> in your spell to
            strike out one of its words.
          </li>
          <li>A ward absorbs only the next hit. Unused words stay in your hand.</li>
          <li>Keys: 1-8 pick words, Enter casts, Esc clears, P passes.</li>
        </ul>
      </details>
    </main>
  )
}
