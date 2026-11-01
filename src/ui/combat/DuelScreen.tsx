import { useEffect } from 'react'
import {
  getWord,
  previewIntent,
  previewSpell,
  type DuelContent,
  type DuelState,
  type RejectReason,
} from '../../engine/index.ts'
import { currentCoachStep } from '../../meta/tutorial.ts'
import { useProfileStore } from '../meta/store.ts'
import { useSettingsStore } from '../meta/settings-store.ts'
import { RichText } from '../RichText.tsx'
import { describeSpell, sentence } from '../text.ts'
import { CombatantPanel } from './CombatantPanel.tsx'
import { useRunStore } from '../run/store.ts'
import { useDuelStore } from './store.ts'
import { WordPage } from './WordPage.tsx'
import './combat.css'

export function DuelScreen() {
  useDuelKeys()
  const content = useDuelStore((store) => store.content)
  const state = useDuelStore((store) => store.state)
  if (!content || !state) return null

  const ended = state.status !== 'ongoing'
  return (
    <main className={`duel status-${state.status}`}>
      <section className="duel-rival" aria-label="Rival inkcaster">
        <CombatantPanel side="enemy" name={content.enemy.name} fighter={state.enemy} />
        <RivalIntent content={content} state={state} />
      </section>

      <div className="duel-middle">
        <CastBanner content={content} />
        <DuelLog round={state.round} />
      </div>

      <section className="duel-player" aria-label="You">
        <CombatantPanel side="player" name="You" fighter={state.player} />
        <Coach content={content} state={state} />
        <WritingDesk content={content} state={state} />
        <Hand content={content} state={state} />
      </section>

      {ended && <ResultOverlay won={state.status === 'won'} rivalName={content.enemy.name} />}
    </main>
  )
}

function RivalIntent({ content, state }: { content: DuelContent; state: DuelState }) {
  const eraseTargets = useDuelStore((store) => store.eraseTargets)
  const selection = useDuelStore((store) => store.selection)
  const toggleErase = useDuelStore((store) => store.toggleErase)
  const selectedWords = selection.flatMap((index) => {
    const card = state.player.hand[index]
    return card ? [getWord(content, card.wordId)] : []
  })
  const erasing = selectedWords.some((word) => word.kind === 'edit')
  const redacting = selectedWords.some((word) => word.kind === 'edit' && word.edit === 'redact')
  const blotting = selectedWords.some(
    (word) => word.kind === 'verb' && word.effects.some((effect) => effect.kind === 'counter'),
  )
  const cancelled = state.enemy.countered || blotting

  // Preview with the erasures the player is about to make.
  const pending: DuelState = {
    ...state,
    enemy: {
      ...state.enemy,
      intent: state.enemy.intent.map((word, index) =>
        eraseTargets.includes(index) ? { ...word, erased: true } : word,
      ),
    },
  }

  return (
    <div className={`intent${erasing ? ' erasing' : ''}${cancelled ? ' cancelled' : ''}`}>
      <span className="intent-label">Next spell</span>
      <div className="intent-words">
        {state.enemy.intent.map((intentWord, index) => {
          const word = getWord(content, intentWord.wordId)
          const targeted = eraseTargets.includes(index)
          const erasable = erasing && !intentWord.erased && (redacting || word.kind !== 'verb')
          return (
            <button
              key={index}
              type="button"
              className={`intent-word kind-${word.kind}${word.kind === 'ink' ? ` element-${word.element}` : ''}${intentWord.erased || targeted ? ' struck' : ''}`}
              disabled={!erasable}
              aria-pressed={targeted}
              title={erasable ? 'Erase this word' : undefined}
              onClick={() => toggleErase(index)}
            >
              {word.name}
            </button>
          )
        })}
      </div>
      <span className="intent-effect">
        <RichText
          text={cancelled ? 'Blotted out: it will not be cast' : describeIntent(content, pending)}
        />
      </span>
      {erasing && (
        <span className="intent-hint">
          {redacting
            ? 'Choose a word to strike out, even the verb'
            : 'Choose a word to erase (not the verb)'}
        </span>
      )}
    </div>
  )
}

/** The rival's spell preview; a struck verb means the spell fizzles. */
function describeIntent(content: DuelContent, state: DuelState): string {
  const preview = previewIntent(content, state)
  return preview.ok ? describeSpell(preview) : 'Fizzles: its verb is struck out'
}

const REJECTION_TEXT: Record<RejectReason, string> = {
  badWordIndex: 'Those words are not in your hand.',
  needOneVerb: 'A spell needs exactly one verb.',
  tooManyWords: 'Too many words for one spell.',
  badEraseTarget: 'That word cannot be erased.',
  eraseTargetCount: "Choose a word to erase in the rival's spell.",
}

function WritingDesk({ content, state }: { content: DuelContent; state: DuelState }) {
  const selection = useDuelStore((store) => store.selection)
  const eraseTargets = useDuelStore((store) => store.eraseTargets)
  const rejection = useDuelStore((store) => store.rejection)
  const pending = useDuelStore((store) => store.pending)
  const { toggleWord, clearSelection, cast, discardAndPass } = useDuelStore.getState()

  const preview = previewSpell(content, state, selection)
  const edits = selection.filter((index) => {
    const card = state.player.hand[index]
    return card && getWord(content, card.wordId).kind === 'edit'
  }).length
  const ready = preview.ok && eraseTargets.length === edits
  const extraSlots = selection.reduce((extra, index) => {
    const card = state.player.hand[index]
    const word = card && getWord(content, card.wordId)
    return word?.kind === 'modifier' && word.modifier.type === 'expand'
      ? extra + word.modifier.words
      : extra
  }, 0)
  const slots = Array.from({ length: content.player.maxWords + extraSlots }, (_, i) => selection[i])

  return (
    <div className="desk">
      <div className="desk-slots">
        {slots.map((handIndex, slot) => {
          const card = handIndex === undefined ? undefined : state.player.hand[handIndex]
          return card && handIndex !== undefined ? (
            <WordPage
              key={card.uid}
              word={getWord(content, card.wordId)}
              onClick={() => toggleWord(handIndex)}
            />
          ) : (
            <span key={`empty-${slot}`} className="desk-slot">
              {slot === 0 ? 'verb' : '…'}
            </span>
          )
        })}
      </div>
      <p className={`desk-preview${preview.ok ? '' : ' invalid'}`} aria-live="polite">
        <RichText
          text={
            selection.length === 0
              ? 'Pick up to three words: one verb, plus modifiers, inks or edits.'
              : describeSpell(preview)
          }
        />
      </p>
      {rejection && <p className="desk-error">{REJECTION_TEXT[rejection.reason]}</p>}
      {pending && (
        <p className="desk-waiting" aria-live="polite">
          {content.enemy.name} is writing…
        </p>
      )}
      <div className="desk-actions">
        <button type="button" className="primary" disabled={!ready || pending} onClick={cast}>
          Cast <kbd>Enter</kbd>
        </button>
        <button type="button" onClick={clearSelection} disabled={selection.length === 0}>
          Clear <kbd>Esc</kbd>
        </button>
        <button type="button" className="quiet" disabled={pending} onClick={discardAndPass}>
          {selection.length === 0 ? 'Pass turn' : `Discard ${selection.length} & pass`}
        </button>
      </div>
    </div>
  )
}

function Hand({ content, state }: { content: DuelContent; state: DuelState }) {
  const selection = useDuelStore((store) => store.selection)
  const toggleWord = useDuelStore((store) => store.toggleWord)
  const pending = useDuelStore((store) => store.pending)
  const full = selection.length >= content.player.maxWords
  return (
    <div className="hand" aria-label="Your words">
      {state.player.hand.map((card, index) => {
        const selected = selection.includes(index)
        return (
          <WordPage
            key={card.uid}
            word={getWord(content, card.wordId)}
            selected={selected}
            disabled={pending || (full && !selected)}
            keyHint={String(index + 1)}
            onClick={() => toggleWord(index)}
          />
        )
      })}
      <span className="deck-count">
        Deck {state.player.drawPile.length} · Discard {state.player.discardPile.length}
      </span>
    </div>
  )
}

function DuelLog({ round }: { round: number }) {
  const log = useDuelStore((store) => store.log)
  return (
    <section className="duel-log" aria-label="Duel log">
      <span className="round">Round {round}</span>
      <ol>
        {log.map((line) => (
          <li key={line.id} className={line.round === round - 1 ? 'recent' : ''}>
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  )
}

function ResultOverlay({ won, rivalName }: { won: boolean; rivalName: string }) {
  const enemyId = useDuelStore((store) => store.enemyId)
  const mode = useDuelStore((store) => store.mode)
  const { startDuel, leaveDuel } = useDuelStore.getState()
  const finishTutorial = (next: 'run' | 'menu') => {
    useSettingsStore.getState().change({ tutorialDone: true })
    leaveDuel()
    if (next === 'run') {
      const { profile } = useProfileStore.getState()
      useRunStore.getState().startRun(profile.selectedLoadout)
    }
  }
  const continueRun = () => {
    const { state } = useDuelStore.getState()
    if (state) useRunStore.getState().finishDuel(state)
    leaveDuel()
  }
  return (
    <div className="veil" role="dialog" aria-modal="true" aria-label="Duel over">
      <p className="veil-title">{won ? 'Victory' : 'Defeat'}</p>
      <p>{won ? `The ${rivalName}'s pages burn.` : 'Your pages blur into ink.'}</p>
      {mode === 'tutorial' ? (
        <div className="veil-actions">
          <button type="button" className="primary" autoFocus onClick={() => finishTutorial('run')}>
            Begin a run
          </button>
          <button type="button" className="quiet" onClick={() => finishTutorial('menu')}>
            Back to menu
          </button>
        </div>
      ) : mode === 'run' ? (
        <div className="veil-actions">
          <button type="button" className="primary" autoFocus onClick={continueRun}>
            Continue
          </button>
        </div>
      ) : (
        <div className="veil-actions">
          <button type="button" autoFocus onClick={() => enemyId && startDuel(enemyId)}>
            Duel again
          </button>
          <button type="button" className="quiet" onClick={leaveDuel}>
            Back to menu
          </button>
        </div>
      )}
    </div>
  )
}

/** The sentence just cast, written large for a moment. */
function CastBanner({ content }: { content: DuelContent }) {
  const lastCast = useDuelStore((store) => store.lastCast)
  if (!lastCast) return <div className="cast-banner" />
  return (
    <div className="cast-banner" aria-hidden="true">
      <span key={lastCast.id} className={`cast-sentence cast-${lastCast.side}`}>
        {sentence(content, lastCast.words)}
      </span>
    </div>
  )
}

/** Tutorial guidance, shown above the writing desk. */
function Coach({ content, state }: { content: DuelContent; state: DuelState }) {
  const mode = useDuelStore((store) => store.mode)
  const selection = useDuelStore((store) => store.selection)
  const eraseTargets = useDuelStore((store) => store.eraseTargets)
  const pending = useDuelStore((store) => store.pending)
  const leaveDuel = useDuelStore((store) => store.leaveDuel)
  if (mode !== 'tutorial') return null
  const step = currentCoachStep({ state, content, selection, eraseTargets, pending })
  if (!step) return null
  return (
    <aside className="coach" aria-live="polite">
      <p>
        <RichText text={step.text} />
      </p>
      <button
        type="button"
        className="quiet"
        onClick={() => {
          useSettingsStore.getState().change({ tutorialDone: true })
          leaveDuel()
        }}
      >
        Skip tutorial
      </button>
    </aside>
  )
}

/** Keyboard: 1-8 pick a word, Enter casts, Esc clears, P passes. */
function useDuelKeys(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const { toggleWord, cast, clearSelection, discardAndPass } = useDuelStore.getState()
      const key = event.key.toLowerCase()
      if (key >= '1' && key <= '8') toggleWord(Number(key) - 1)
      else if (key === 'enter') {
        event.preventDefault()
        cast()
      } else if (key === 'escape') clearSelection()
      else if (key === 'p') discardAndPass()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
