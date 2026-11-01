import type { WordDef } from '../../engine/index.ts'
import { RichText } from '../RichText.tsx'
import { KIND_LABELS, describeWord } from '../text.ts'

interface Props {
  word: WordDef
  selected?: boolean
  disabled?: boolean
  keyHint?: string
  onClick: () => void
}

/** One word page, in the hand or on the writing desk. */
export function WordPage({ word, selected = false, disabled = false, keyHint, onClick }: Props) {
  const element = word.kind === 'ink' ? ` element-${word.element}` : ''
  const tier = word.tier ? ` tier-${word.tier}` : ''
  return (
    <button
      type="button"
      className={`word kind-${word.kind}${element}${tier}${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="word-name">
        {word.name}
        {word.tier && <span className="word-tier"> {word.tier === 2 ? 'II' : 'III'}</span>}
      </span>
      <span className="word-kind">{KIND_LABELS[word.kind]}</span>
      <span className="word-text">
        <RichText text={describeWord(word)} focusable={false} />
      </span>
      {keyHint && <span className="key-hint">{keyHint}</span>}
    </button>
  )
}
