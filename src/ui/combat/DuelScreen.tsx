import { useEffect } from 'react'
import {
  getWord,
  previewIntent,
  previewSpell,
  type DuelContent,
  type DuelState,
  type RejectReason,
} from '../../engine/index.ts'
import { describeSpell } from '../text.ts'
import { CombatantPanel } from './CombatantPanel.tsx'
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

      <DuelLog round={state.round} />

      <section className="duel-player" aria-label="You">
        <CombatantPanel side="player" name="You" fighter={state.player} />
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
          const erasable = erasing && !intentWord.erased && word.kind !== 'verb'
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
        {cancelled
          ? 'Blotted out: it will not be cast'
          : describeSpell(previewIntent(content, pending))}
      </span>
      {erasing && <span className="intent-hint">Choose a word to erase (not the verb)</span>}
    </div>
  )
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
        {selection.length === 0
          ? 'Pick up to three words: one verb, plus modifiers, inks or edits.'
          : describeSpell(preview)}
      </p>
      {rejection && <p className="desk-error">{REJECTION_TEXT[rejection.reason]}</p>}
      <div className="desk-actions">
        <button type="button" className="primary" disabled={!ready} onClick={cast}>
          Cast <kbd>Enter</kbd>
        </button>
        <button type="button" onClick={clearSelection} disabled={selection.length === 0}>
          Clear <kbd>Esc</kbd>
        </button>
        <button type="button" className="quiet" onClick={discardAndPass}>
          {selection.length === 0 ? 'Pass turn' : `Discard ${selection.length} & pass`}
        </button>
      </div>
    </div>
  )
}

function Hand({ content, state }: { content: DuelContent; state: DuelState }) {
  const selection = useDuelStore((store) => store.selection)
  const toggleWord = useDuelStore((store) => store.toggleWord)
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
            disabled={full && !selected}
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
  const { startDuel, leaveDuel } = useDuelStore.getState()
  return (
    <div className="veil" role="dialog" aria-modal="true" aria-label="Duel over">
      <p className="veil-title">{won ? 'Victory' : 'Defeat'}</p>
      <p>{won ? `The ${rivalName}'s pages burn.` : 'Your pages blur into ink.'}</p>
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
