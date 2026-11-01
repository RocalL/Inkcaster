import { GLOSSARY, splitKeywords } from './glossary.ts'

/**
 * Text with glossary keywords underlined. Hover or focus (tap on touch screens) shows the rule.
 * Inside a button (word pages) pass `focusable={false}`: nested focus targets are invalid.
 */
export function RichText({ text, focusable = true }: { text: string; focusable?: boolean }) {
  return (
    <>
      {splitKeywords(text).map((part, index) =>
        part.keyword ? (
          <span
            key={index}
            className="keyword"
            tabIndex={focusable ? 0 : undefined}
            data-tip={GLOSSARY[part.keyword]}
            aria-label={`${part.text}: ${GLOSSARY[part.keyword]}`}
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}
