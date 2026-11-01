import { describe, expect, it } from 'vitest'
import {
  act,
  chooseEnemySpell,
  createDuel,
  greedyBot,
  previewIntent,
  previewSpell,
  runDuel,
  seedRng,
  type DuelState,
  type EnemyDef,
  type PlayerCommand,
} from '../../src/engine/index.ts'
import { duelWithHand, makeContent } from './fixtures.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('createDuel', () => {
  it('deals the opening hand and reveals the rival first spell', () => {
    const content = makeContent()
    const state = createDuel(content, 1)
    expect(state.player.hand).toHaveLength(4)
    expect(state.player.drawPile).toHaveLength(4)
    expect(state.enemy.intent).toEqual([{ wordId: 'strike', erased: false }])
    expect(state.round).toBe(1)
  })

  it('shuffles deterministically per seed', () => {
    const content = makeContent()
    expect(createDuel(content, 5)).toEqual(createDuel(content, 5))
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        createDuel(content, seed)
          .player.hand.map((card) => card.uid)
          .join(),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })

  it('rejects unknown word ids', () => {
    expect(() => createDuel(makeContent({ player: { deck: ['nope'] } }), 1)).toThrow(/nope/)
  })
})

describe('act: a round', () => {
  it('your spell, then the rival turn, then your hand is refilled', () => {
    const content = makeContent()
    const start = duelWithHand(content, ['strike', 'twice', 'ward', 'mend'])
    const { state, events } = act(content, start, { type: 'write', words: [0, 1] })

    expect(events.map((event) => event.type)).toEqual([
      'spellWritten',
      'damage',
      'damage',
      'wordDrawn',
      'wordDrawn',
      'spellWritten',
      'damage',
      'intent',
    ])
    expect(state.enemy.hp).toBe(22)
    expect(state.player.hp).toBe(26)
    expect(state.player.hand.map((card) => card.wordId).slice(0, 2)).toEqual(['ward', 'mend'])
    expect(state.player.hand).toHaveLength(4)
    expect(state.player.discardPile.map((card) => card.uid)).toEqual([100, 101])
    expect(state.round).toBe(2)
  })

  it('discarding words ends the turn without casting', () => {
    const content = makeContent()
    const start = duelWithHand(content, ['twice', 'fire', 'ward', 'mend'])
    const { state, events } = act(content, start, { type: 'discard', words: [0, 1] })
    expect(events[0]).toEqual({ type: 'wordsDiscarded', count: 2 })
    expect(state.enemy.hp).toBe(30)
    expect(state.player.discardPile.map((card) => card.wordId)).toEqual(['twice', 'fire'])
  })

  it('is a no-op once the duel is over', () => {
    const content = makeContent()
    const ended: DuelState = { ...createDuel(content, 1), status: 'won' }
    const result = act(content, ended, { type: 'discard', words: [] })
    expect(result.state).toBe(ended)
    expect(result.events).toEqual([])
  })
})

describe('erase', () => {
  const rival: Partial<EnemyDef> = { spells: [{ words: ['greater', 'strike', 'twice'] }] }

  it("strikes out a word of the rival's next spell", () => {
    const content = makeContent({ enemy: rival })
    const start = duelWithHand(content, ['erase', 'ward'])
    const { state, events } = act(content, start, { type: 'write', words: [0, 1], erase: [2] })
    expect(events).toContainEqual({ type: 'wordErased', wordId: 'twice' })
    // Without Twice: one Greater Strike of 7, absorbed by Ward 6.
    expect(events).toContainEqual({
      type: 'spellWritten',
      side: 'enemy',
      words: ['greater', 'strike'],
    })
    expect(state.player.hp).toBe(29)
  })

  it('previewIntent shows the effect of erasures and chill', () => {
    const content = makeContent({ enemy: rival })
    const state = createDuel(content, 1)
    const before = previewIntent(content, state)
    expect(before.ok && before.effects).toEqual([
      { kind: 'damage', amount: 7 },
      { kind: 'damage', amount: 7 },
    ])
    state.enemy.intent[0] = { wordId: 'greater', erased: true }
    state.enemy.statuses.chill = 3
    const after = previewIntent(content, state)
    expect(after.ok && after.effects).toEqual([
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 1 },
    ])
  })
})

describe('validation', () => {
  const content = makeContent({ enemy: { spells: [{ words: ['fire', 'strike'] }] } })
  const start = duelWithHand(content, ['strike', 'ward', 'twice', 'erase', 'greater'])

  const rejected = (command: PlayerCommand) => {
    const result = act(content, start, command)
    expect(result.state).toBe(start)
    const event = result.events[0]
    return event?.type === 'commandRejected' ? event.reason : null
  }

  it('rejects bad hand indices and duplicates', () => {
    expect(rejected({ type: 'write', words: [9] })).toBe('badWordIndex')
    expect(rejected({ type: 'write', words: [0, 0] })).toBe('badWordIndex')
    expect(rejected({ type: 'discard', words: [-1] })).toBe('badWordIndex')
  })

  it('needs exactly one verb', () => {
    expect(rejected({ type: 'write', words: [2] })).toBe('needOneVerb')
    expect(rejected({ type: 'write', words: [0, 1] })).toBe('needOneVerb')
  })

  it('limits the number of words', () => {
    expect(rejected({ type: 'write', words: [0, 2, 4, 3], erase: [0] })).toBe('tooManyWords')
  })

  it('needs one valid erase target per edit word, never the verb', () => {
    expect(rejected({ type: 'write', words: [0, 3] })).toBe('eraseTargetCount')
    expect(rejected({ type: 'write', words: [0, 3], erase: [1] })).toBe('badEraseTarget')
    expect(rejected({ type: 'write', words: [0, 3], erase: [5] })).toBe('badEraseTarget')
    expect(rejected({ type: 'write', words: [0], erase: [0] })).toBe('eraseTargetCount')
  })

  it('previewSpell matches what a cast would do', () => {
    const preview = previewSpell(content, start, [0, 2, 4])
    expect(preview.ok && preview.effects).toEqual([
      { kind: 'damage', amount: 7 },
      { kind: 'damage', amount: 7 },
    ])
  })
})

describe('rival behaviour', () => {
  it('rotation casts its spells in order and loops', () => {
    const content = makeContent({
      enemy: { maxHp: 999, spells: [{ words: ['strike'] }, { words: ['ward'] }] },
      player: { maxHp: 999 },
    })
    let state = createDuel(content, 1)
    const cast: string[][] = []
    for (let i = 0; i < 4; i++) {
      const result = act(content, state, { type: 'discard', words: [] })
      for (const event of result.events) {
        if (event.type === 'spellWritten' && event.side === 'enemy') cast.push(event.words)
      }
      state = result.state
    }
    expect(cast).toEqual([['strike'], ['ward'], ['strike'], ['ward']])
  })

  it('weighted picks follow the weights, deterministically', () => {
    const def: EnemyDef = {
      ...makeContent().enemy,
      behaviour: 'weighted',
      spells: [
        { words: ['strike'], weight: 3 },
        { words: ['ward'], weight: 1 },
        { words: ['mend'], weight: 0 },
      ],
    }
    const enemy = createDuel(makeContent(), 1).enemy
    expect(chooseEnemySpell(def, enemy, seedRng(4))).toEqual(
      chooseEnemySpell(def, enemy, seedRng(4)),
    )
    const counts = [0, 0, 0]
    let rng = seedRng(11)
    for (let i = 0; i < 4000; i++) {
      const [index, next] = chooseEnemySpell(def, enemy, rng)
      counts[index] = (counts[index] ?? 0) + 1
      rng = next
    }
    expect(counts[2]).toBe(0)
    expect((counts[0] ?? 0) / 4000).toBeCloseTo(0.75, 1)
  })
})

describe('purity and determinism', () => {
  it('act never mutates its input state', () => {
    const content = makeContent({
      enemy: { maxHp: 500, spells: [{ words: ['fire', 'strike'] }, { words: ['ice', 'ward'] }] },
      player: { maxHp: 500, deck: ['strike', 'fire', 'twice', 'arcane', 'ward', 'ice', 'mend'] },
    })
    let state: DuelState = deepFreeze(createDuel(content, 3))
    for (let i = 0; i < 40; i++) {
      state = deepFreeze(act(content, state, greedyBot(state, content)).state)
    }
    expect(state.round).toBe(41)
  })

  it('same seed and same inputs give the same duel', () => {
    const content = makeContent()
    expect(runDuel(content, 77, greedyBot, { recordLog: true })).toEqual(
      runDuel(content, 77, greedyBot, { recordLog: true }),
    )
  })

  it('runDuel plays to a result, or a timeout', () => {
    const content = makeContent()
    expect(runDuel(content, 1, greedyBot).outcome).not.toBe('timeout')
    const stalled = runDuel(
      makeContent({ enemy: { spells: [{ words: ['ward'] }] } }),
      1,
      () => ({
        type: 'discard',
        words: [],
      }),
      { maxRounds: 5 },
    )
    expect(stalled.outcome).toBe('timeout')
  })
})
