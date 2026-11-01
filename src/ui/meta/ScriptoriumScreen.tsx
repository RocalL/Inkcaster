import { useState } from 'react'
import { LOADOUTS, REWARD_POOL, WORDS_BY_ID } from '../../data/index.ts'
import { BINDINGS } from '../../data/scriptorium.ts'
import { MAX_TIER, isRewritable, rewriteWord } from '../../engine/index.ts'
import { priceOf, type Purchase } from '../../meta/profile.ts'
import { WordPage } from '../combat/WordPage.tsx'
import { describeWord } from '../text.ts'
import { useProfileStore } from './store.ts'
import './scriptorium.css'

type Tab = 'bindings' | 'rewrite' | 'grimoire' | 'loadouts'

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'bindings', label: 'Bindings', blurb: 'Passive strengths that last every run.' },
  { id: 'rewrite', label: 'Rewrite', blurb: 'Upgrade a word for good, up to tier III.' },
  { id: 'grimoire', label: 'Grimoire', blurb: 'New words that can be offered as rewards.' },
  { id: 'loadouts', label: 'Loadouts', blurb: 'New starting grimoires, with their words.' },
]

export function ScriptoriumScreen() {
  const profile = useProfileStore((store) => store.profile)
  const { closeScriptorium } = useProfileStore.getState()
  const [tab, setTab] = useState<Tab>('bindings')
  const active = TABS.find((candidate) => candidate.id === tab)

  return (
    <main className="scriptorium">
      <header className="scriptorium-header">
        <h1>The Scriptorium</h1>
        <span className="gold">✦ {profile.gold} gold</span>
        <button type="button" className="quiet" onClick={closeScriptorium}>
          Back
        </button>
      </header>

      <nav className="tabs" aria-label="Scriptorium sections">
        {TABS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={candidate.id === tab}
            onClick={() => setTab(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </nav>
      <p className="tab-blurb">{active?.blurb}</p>

      {tab === 'bindings' && <Bindings />}
      {tab === 'rewrite' && <Rewrites />}
      {tab === 'grimoire' && <WordUnlocks />}
      {tab === 'loadouts' && <LoadoutUnlocks />}
    </main>
  )
}

/** A buy button showing the price; disabled when owned, maxed or too dear. */
function BuyButton({ purchase, owned = 'Owned' }: { purchase: Purchase; owned?: string }) {
  const profile = useProfileStore((store) => store.profile)
  const buy = useProfileStore((store) => store.buy)
  const price = priceOf(profile, purchase)
  if (price === null) return <span className="owned">{owned}</span>
  return (
    <button
      type="button"
      className="buy"
      disabled={price > profile.gold}
      onClick={() => buy(purchase)}
    >
      ✦ {price}
    </button>
  )
}

function Bindings() {
  const profile = useProfileStore((store) => store.profile)
  return (
    <ul className="shop-list">
      {BINDINGS.map((binding) => {
        const rank = profile.bindings[binding.id] ?? 0
        return (
          <li key={binding.id} className="shop-item">
            <div>
              <span className="item-name">{binding.name}</span>
              <span className="item-text">{binding.description} per rank</span>
            </div>
            <span className="ranks" aria-label={`Rank ${rank} of ${binding.costs.length}`}>
              {binding.costs.map((_, i) => (i < rank ? '●' : '○')).join(' ')}
            </span>
            <BuyButton purchase={{ type: 'binding', id: binding.id }} owned="Max rank" />
          </li>
        )
      })}
    </ul>
  )
}

function Rewrites() {
  const profile = useProfileStore((store) => store.profile)
  const words = profile.unlockedWords.flatMap((id) => {
    const word = WORDS_BY_ID[id]
    return word && isRewritable(word) ? [word] : []
  })
  return (
    <ul className="shop-grid">
      {words.map((word) => {
        const tier = profile.rewrites[word.id] ?? 1
        const next = tier < MAX_TIER ? rewriteWord(word, (tier + 1) as 2 | 3) : null
        return (
          <li key={word.id} className="shop-card">
            <WordPage word={rewriteWord(word, tier)} onClick={() => {}} disabled />
            <span className="item-text">
              {next ? `Next: ${describeWord(next)}` : 'Fully rewritten'}
            </span>
            <BuyButton purchase={{ type: 'rewrite', id: word.id }} owned="Tier III" />
          </li>
        )
      })}
    </ul>
  )
}

function WordUnlocks() {
  return (
    <ul className="shop-grid">
      {REWARD_POOL.map((reward) => {
        const word = WORDS_BY_ID[reward.wordId]
        if (!word) return null
        return (
          <li key={reward.wordId} className={`shop-card rarity-${reward.rarity}`}>
            <WordPage word={word} onClick={() => {}} disabled />
            <span className="rarity">{reward.rarity}</span>
            <BuyButton purchase={{ type: 'word', id: reward.wordId }} owned="Unlocked" />
          </li>
        )
      })}
    </ul>
  )
}

function LoadoutUnlocks() {
  return (
    <ul className="shop-list">
      {LOADOUTS.map((loadout) => (
        <li key={loadout.id} className="shop-item">
          <div>
            <span className="item-name">{loadout.name}</span>
            <span className="item-text">{loadout.summary}</span>
            <span className="item-words">
              {[...new Set(loadout.deck)].map((id) => WORDS_BY_ID[id]?.name).join(', ')}
            </span>
          </div>
          <BuyButton purchase={{ type: 'loadout', id: loadout.id }} owned="Unlocked" />
        </li>
      ))}
    </ul>
  )
}
