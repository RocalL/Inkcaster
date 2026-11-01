import { RUN_CONTENT, getLoadout } from '../../data/index.ts'
import { getWord, type RunState } from '../../engine/index.ts'
import { WordPage } from '../combat/WordPage.tsx'
import { useRunStore } from './store.ts'
import './run.css'

/** Everything in a run that is not a duel: the map, rewards and the end screen. */
export function RunScreen() {
  const run = useRunStore((store) => store.run)
  if (!run) return null
  switch (run.phase) {
    case 'map':
    case 'duel':
      return <RunMap run={run} />
    case 'reward':
      return <RewardPicker run={run} />
    case 'won':
    case 'lost':
      return <RunEnd run={run} />
  }
}

function RunHeader({ run }: { run: RunState }) {
  const loadoutId = useRunStore((store) => store.loadoutId)
  const floors = run.path.length
  return (
    <header className="run-header">
      <span className="run-title">{loadoutId ? getLoadout(loadoutId).name : 'Run'}</span>
      <div
        className="health-bar run-hp"
        role="meter"
        aria-label="Health"
        aria-valuemin={0}
        aria-valuemax={run.maxHp}
        aria-valuenow={run.hp}
      >
        <div className="health-fill" style={{ width: `${(run.hp / run.maxHp) * 100}%` }} />
        <span className="health-text">
          {run.hp} / {run.maxHp}
        </span>
      </div>
      <span className="run-stat">✦ {run.gold} gold</span>
      <span className="run-stat">
        Floor {Math.min(run.floor + 1, floors)} / {floors}
      </span>
    </header>
  )
}

function RunMap({ run }: { run: RunState }) {
  const { enterDuel, leaveRun } = useRunStore.getState()
  const rivalName = (id: string) => RUN_CONTENT.enemies[id]?.name ?? id
  const next = rivalName(run.path[run.floor] ?? '')
  return (
    <main className="run">
      <RunHeader run={run} />

      <ol className="floors" aria-label="Floors">
        {run.path.map((enemyId, floor) => {
          const boss = floor === run.path.length - 1
          const status = floor < run.floor ? 'cleared' : floor === run.floor ? 'current' : 'ahead'
          return (
            <li key={floor} className={`floor floor-${status}${boss ? ' floor-boss' : ''}`}>
              <span className="floor-number">{boss ? 'Boss' : floor + 1}</span>
              <span className="floor-rival">{rivalName(enemyId)}</span>
              <span className="floor-status">
                {status === 'cleared' ? '✓' : status === 'current' ? 'next' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="run-actions">
        <button type="button" className="primary" autoFocus onClick={enterDuel}>
          {run.phase === 'duel' ? 'Resume duel' : 'Duel'} {next}
        </button>
      </div>

      <Grimoire deck={run.deck} />

      <p className="run-footer">
        <button type="button" className="quiet" onClick={leaveRun}>
          Abandon run
        </button>
      </p>
    </main>
  )
}

function Grimoire({ deck }: { deck: readonly string[] }) {
  const counts = new Map<string, number>()
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1)
  return (
    <details className="grimoire">
      <summary>Your grimoire ({deck.length} words)</summary>
      <ul>
        {[...counts].map(([id, count]) => (
          <li key={id} className={`grimoire-word kind-${getWord(RUN_CONTENT, id).kind}`}>
            {getWord(RUN_CONTENT, id).name}
            {count > 1 && <span className="grimoire-count"> ×{count}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}

function RewardPicker({ run }: { run: RunState }) {
  const chooseReward = useRunStore((store) => store.chooseReward)
  const last = run.lastDuel
  return (
    <main className="run">
      <RunHeader run={run} />
      <section className="reward">
        <h2>Victory</h2>
        {last && (
          <p className="reward-summary">
            +{last.goldEarned} gold{last.healed > 0 ? ` · healed ${last.healed}` : ''} · won in{' '}
            {last.rounds} rounds
          </p>
        )}
        <h3>Write a new word into your grimoire</h3>
        <div className="reward-options">
          {run.rewardOptions.map((id) => {
            const rarity = RUN_CONTENT.rewardPool.find((reward) => reward.wordId === id)?.rarity
            return (
              <div key={id} className={`reward-option rarity-${rarity ?? 'common'}`}>
                <WordPage word={getWord(RUN_CONTENT, id)} onClick={() => chooseReward(id)} />
                <span className="rarity">{rarity}</span>
              </div>
            )
          })}
        </div>
        <button type="button" className="quiet" onClick={() => chooseReward(null)}>
          Skip: keep the grimoire as it is
        </button>
      </section>
      <Grimoire deck={run.deck} />
    </main>
  )
}

function RunEnd({ run }: { run: RunState }) {
  const leaveRun = useRunStore((store) => store.leaveRun)
  const won = run.phase === 'won'
  const cleared = won ? run.path.length : run.floor
  const killer = RUN_CONTENT.enemies[run.path[run.floor] ?? '']?.name
  return (
    <main className="run run-end">
      <h2 className="run-end-title">{won ? 'The Archive is yours' : 'Your pages blur'}</h2>
      <p>
        {won
          ? `You defeated all ${run.path.length} rivals.`
          : `Defeated by ${killer ?? 'a rival'} on floor ${run.floor + 1} of ${run.path.length}.`}
      </p>
      <dl className="run-summary">
        <dt>Floors cleared</dt>
        <dd>
          {cleared} / {run.path.length}
        </dd>
        <dt>Gold kept</dt>
        <dd>
          {run.gold}
          {won ? '' : ' (half of what you earned)'}
        </dd>
        <dt>Grimoire</dt>
        <dd>{run.deck.length} words</dd>
      </dl>
      <p className="run-note">Gold will be spent in the Scriptorium (coming soon).</p>
      <button type="button" className="primary" autoFocus onClick={leaveRun}>
        Back to menu
      </button>
    </main>
  )
}
