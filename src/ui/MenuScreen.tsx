import { BOSS_IDS, ENEMIES, LOADOUTS, RUN_CONTENT } from '../data/index.ts'
import { LOADOUT_UNLOCK_COST } from '../data/scriptorium.ts'
import { useDuelStore } from './combat/store.ts'
import { useProfileStore } from './meta/store.ts'
import { useRunStore } from './run/store.ts'

export function MenuScreen() {
  const profile = useProfileStore((store) => store.profile)
  const persistent = useProfileStore((store) => store.persistent)
  const { selectLoadout, openScriptorium } = useProfileStore.getState()
  const startDuel = useDuelStore((store) => store.startDuel)
  const { startRun, resumeRun } = useRunStore.getState()
  const floors = RUN_CONTENT.floors.length
  const saved = profile.currentRun

  return (
    <main className="menu">
      <h1>Inkcaster</h1>
      <p className="tagline">Write your spells. Survive the duel. Rewrite yourself.</p>

      <p className="profile-line">
        <span className="gold">✦ {profile.gold} gold</span>
        {profile.stats.runs > 0 && (
          <span>
            {' '}
            · {profile.stats.runs} runs · {profile.stats.wins} won · best {profile.stats.bestFloors}
            /{floors + 1} floors
          </span>
        )}
      </p>

      {!persistent && (
        <p className="storage-warning" role="status">
          This browser is not letting Inkcaster save, so progress will be lost when you close it.
        </p>
      )}

      {saved ? (
        <div className="begin">
          <button type="button" className="primary begin-run" onClick={resumeRun}>
            Resume run
          </button>
          <p className="begin-hint">
            {LOADOUTS.find((loadout) => loadout.id === saved.loadoutId)?.name} · floor{' '}
            {saved.run.floor + 1} of {saved.run.path.length} · {saved.run.hp} HP
          </p>
        </div>
      ) : (
        <>
          <h2>Choose your grimoire</h2>
          <ul className="loadouts">
            {LOADOUTS.map((loadout) => {
              const unlocked = profile.unlockedLoadouts.includes(loadout.id)
              return (
                <li key={loadout.id}>
                  <button
                    type="button"
                    className={`loadout${unlocked ? '' : ' locked'}`}
                    aria-pressed={loadout.id === profile.selectedLoadout}
                    disabled={!unlocked}
                    onClick={() => selectLoadout(loadout.id)}
                  >
                    <span className="loadout-name">
                      {unlocked ? '' : '🔒 '}
                      {loadout.name}
                    </span>
                    <span className="loadout-summary">
                      {unlocked
                        ? loadout.summary
                        : `Unlock in the Scriptorium (${LOADOUT_UNLOCK_COST} gold)`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="begin">
            <button
              type="button"
              className="primary begin-run"
              onClick={() => startRun(profile.selectedLoadout)}
            >
              Begin a run
            </button>
            <p className="begin-hint">
              {floors} duels, then the boss. Your wounds carry over; each win adds a word to your
              grimoire.
            </p>
          </div>
        </>
      )}

      <div className="menu-row">
        <button type="button" className="scriptorium-button" onClick={openScriptorium}>
          The Scriptorium
          <span>spend gold on words, rewrites and bindings</span>
        </button>
      </div>

      <details className="practice">
        <summary>Practice duel</summary>
        <ul className="rivals">
          {ENEMIES.filter((enemy) => !BOSS_IDS.includes(enemy.id)).map((enemy) => (
            <li key={enemy.id}>
              <button type="button" className="rival" onClick={() => startDuel(enemy.id)}>
                <span className="rival-name">{enemy.name}</span>
                <span className="rival-meta">
                  {enemy.maxHp} HP ·{' '}
                  {enemy.behaviour === 'rotation' ? 'methodical' : 'unpredictable'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      <details className="how-to">
        <summary>How to duel</summary>
        <ul>
          <li>
            Each turn, <strong>write one spell</strong> from your hand: exactly one{' '}
            <strong>verb</strong> plus up to two more words.
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
