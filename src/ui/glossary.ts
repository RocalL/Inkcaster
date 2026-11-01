// Glossary: every game keyword and its rule, so any text can explain itself on hover or tap.
// Pure (no React): `splitKeywords` is unit-tested; RichText.tsx renders it.

import { STATUS_RULES } from './text.ts'

export const GLOSSARY: Readonly<Record<string, string>> = {
  Burn: STATUS_RULES.burn,
  Chill: STATUS_RULES.chill,
  Focus: STATUS_RULES.focus,
  Thorns: STATUS_RULES.thorns,
  Regen: STATUS_RULES.regen,
  Brand: STATUS_RULES.brand,
  Stain: STATUS_RULES.stain,
  Inspire: STATUS_RULES.inspire,
  Ward: 'Absorbs the next hit only, then fades. Burn and Stain go through it; piercing ignores it.',
  ward: 'Absorbs the next hit only, then fades. Burn and Stain go through it; piercing ignores it.',
  piercing: 'Ignores wards: the hit lands in full and the ward stays up.',
  familiars:
    "Summoned creatures. They strike at the end of their owner's turn, then fade after a few turns.",
  Echo: 'The spell is cast again, by itself, at the start of your next turn.',
  verb: 'Every spell needs exactly one verb: it says what the spell does.',
}

const PATTERN = new RegExp(`\\b(${Object.keys(GLOSSARY).join('|')})\\b`, 'g')

export type TextPart = { text: string; keyword?: string }

/** Splits text into plain parts and keyword parts (each keyword once per text). */
export function splitKeywords(text: string): TextPart[] {
  const parts: TextPart[] = []
  const seen = new Set<string>()
  let last = 0
  for (const match of text.matchAll(PATTERN)) {
    const word = match[0]
    const index = match.index ?? 0
    if (seen.has(word.toLowerCase())) continue
    seen.add(word.toLowerCase())
    if (index > last) parts.push({ text: text.slice(last, index) })
    parts.push({ text: word, keyword: word })
    last = index + word.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
