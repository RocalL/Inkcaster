import { ENEMIES } from '../data/index.ts'
import { useCombatStore } from './combat/store.ts'

export function MenuScreen() {
  const startDuel = useCombatStore((store) => store.startDuel)
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
                {enemy.maxHp} HP · {enemy.spells.length} spells ·{' '}
                {enemy.behaviour === 'rotation' ? 'methodical' : 'unpredictable'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <details className="how-to">
        <summary>How to duel</summary>
        <ul>
          <li>Time only moves when you act. On your turn, cast one page or gather ink.</li>
          <li>
            Each page costs ink and <strong>time</strong>: you act again that many seconds later,
            while the rival's spells keep landing.
          </li>
          <li>Ink refills as time passes. Gathering ink lets one second pass.</li>
          <li>
            A ward absorbs only the <strong>next</strong> hit. Watch the timeline: don't waste a big
            ward on a small spell. The rival's wards work the same way.
          </li>
          <li>
            Click a page, drag it upward, or press its number. Space gathers ink, F speeds time.
          </li>
        </ul>
      </details>
    </main>
  )
}
