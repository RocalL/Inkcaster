import { WAIT_SECONDS, isPlayerTurn } from '../../engine/index.ts'
import { CastBar } from './CastBar.tsx'
import { CombatantPanel } from './CombatantPanel.tsx'
import { Hand } from './Hand.tsx'
import { InkWell } from './InkWell.tsx'
import { useCombatStore } from './store.ts'
import { Timeline } from './Timeline.tsx'
import { useCombatKeys, useCombatLoop } from './use-combat-loop.ts'
import './combat.css'

export function CombatScreen() {
  useCombatLoop()
  useCombatKeys()
  const content = useCombatStore((store) => store.content)
  const state = useCombatStore((store) => store.state)
  if (!content || !state) return null

  const ended = state.status !== 'ongoing'
  const yourTurn = isPlayerTurn(state)
  return (
    <main className={`combat status-${state.status}${yourTurn ? ' your-turn' : ''}`}>
      <section className="combat-enemy" aria-label="Rival inkcaster">
        <CombatantPanel side="enemy" name={content.enemy.name} combatant={state.enemy} />
        <CastBar enemy={state.enemy} content={content} />
      </section>

      <section className="combat-middle">
        <Timeline state={state} content={content} />
        <CombatLog />
      </section>

      <section className="combat-player" aria-label="You">
        <div className="player-row">
          <CombatantPanel side="player" name="You" combatant={state.player} />
          <InkWell player={state.player} />
        </div>
        <p className="turn-banner" aria-live="polite">
          {ended ? '' : yourTurn ? 'Your turn: choose a page' : 'Time flows…'}
        </p>
        <Hand state={state} content={content} />
        <Controls yourTurn={yourTurn} />
      </section>

      {ended && <ResultOverlay won={state.status === 'won'} enemyName={content.enemy.name} />}
    </main>
  )
}

function CombatLog() {
  const log = useCombatStore((store) => store.log)
  return (
    <ol className="combat-log" aria-label="Combat log">
      {log.map((line) => (
        <li key={line.id}>{line.text}</li>
      ))}
    </ol>
  )
}

function Controls({ yourTurn }: { yourTurn: boolean }) {
  const flow = useCombatStore((store) => store.flow)
  const { gatherInk, toggleFlow, leaveDuel } = useCombatStore.getState()
  return (
    <div className="controls">
      <button type="button" onClick={gatherInk} disabled={!yourTurn}>
        Gather ink ({WAIT_SECONDS}s) <kbd>Space</kbd>
      </button>
      <button type="button" onClick={toggleFlow} aria-pressed={flow === 'fast'}>
        Fast time {flow === 'fast' ? 'on' : 'off'} <kbd>F</kbd>
      </button>
      <button type="button" className="quiet" onClick={leaveDuel}>
        Flee
      </button>
    </div>
  )
}

function ResultOverlay({ won, enemyName }: { won: boolean; enemyName: string }) {
  const enemyId = useCombatStore((store) => store.enemyId)
  const { startDuel, leaveDuel } = useCombatStore.getState()
  return (
    <div className="veil veil-result" role="dialog" aria-modal="true" aria-label="Duel over">
      <p className="veil-title">{won ? 'Victory' : 'Defeat'}</p>
      <p>{won ? `The ${enemyName}'s pages burn.` : 'Your pages blur into ink.'}</p>
      <div className="veil-actions">
        <button type="button" autoFocus onClick={() => enemyId && startDuel(enemyId)}>
          Duel again
        </button>
        <button type="button" className="quiet" onClick={leaveDuel}>
          Back to menu
        </button>
      </div>
    </div>
  )
}
