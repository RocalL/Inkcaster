import { beforeEach, describe, expect, it } from 'vitest'
import { useDuelStore } from '../../src/ui/combat/store.ts'
import { newProfile } from '../../src/meta/profile.ts'
import { useProfileStore } from '../../src/ui/meta/store.ts'
import { useRunStore } from '../../src/ui/run/store.ts'

const runStore = () => useRunStore.getState()
const duelStore = () => useDuelStore.getState()

describe('run store', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: newProfile(), loaded: true, persistent: false })
    duelStore().leaveDuel()
    runStore().startRun('warden', 5)
  })

  it('starts on the map of a 7-floor run with the loadout deck', () => {
    expect(runStore().run).toMatchObject({ phase: 'map', floor: 0, gold: 0 })
    expect(runStore().run?.path).toHaveLength(7)
    expect(runStore().run?.deck).toContain('bulwark')
  })

  it('entering a duel opens it in run mode with the run hp', () => {
    runStore().enterDuel()
    expect(runStore().run?.phase).toBe('duel')
    expect(duelStore().mode).toBe('run')
    expect(duelStore().state?.player.hp).toBe(runStore().run?.hp)
    expect(duelStore().content?.enemy.id).toBe(runStore().run?.path[0])
  })

  it('a won duel leads to a reward, and picking it moves to the next floor', () => {
    runStore().enterDuel()
    const duel = duelStore().state
    if (!duel) throw new Error('No duel')
    runStore().finishDuel({ ...duel, status: 'won' })
    const run = runStore().run
    expect(run?.phase).toBe('reward')
    const pick = run?.rewardOptions[0] ?? null
    runStore().chooseReward(pick)
    expect(runStore().run).toMatchObject({ phase: 'map', floor: 1 })
    expect(runStore().run?.deck.at(-1)).toBe(pick)
  })

  it('a lost duel ends the run; leaving clears it', () => {
    runStore().enterDuel()
    const duel = duelStore().state
    if (!duel) throw new Error('No duel')
    runStore().finishDuel({ ...duel, status: 'lost' })
    expect(runStore().run?.phase).toBe('lost')
    runStore().leaveRun()
    expect(runStore().run).toBeNull()
  })

  it('saves the run in the profile while it lasts, then banks its gold', () => {
    expect(useProfileStore.getState().profile.currentRun?.loadoutId).toBe('warden')
    runStore().enterDuel()
    const duel = duelStore().state
    if (!duel) throw new Error('No duel')
    runStore().finishDuel({ ...duel, status: 'won' })
    const gold = runStore().run?.gold ?? 0
    expect(useProfileStore.getState().profile.currentRun?.run.phase).toBe('reward')

    runStore().chooseReward(null)
    runStore().enterDuel()
    const next = duelStore().state
    if (!next) throw new Error('No duel')
    runStore().finishDuel({ ...next, status: 'lost' })
    const profile = useProfileStore.getState().profile
    expect(profile.currentRun).toBeNull()
    expect(profile.gold).toBe(Math.floor(gold / 2))
    expect(profile.stats.runs).toBe(1)
  })

  it('abandoning a run keeps no gold and clears the saved run', () => {
    runStore().leaveRun()
    expect(useProfileStore.getState().profile).toMatchObject({ gold: 0, currentRun: null })
  })

  it('resumes the run saved in the profile', () => {
    runStore().enterDuel()
    useRunStore.setState({ run: null, content: null, loadoutId: null })
    runStore().resumeRun()
    expect(runStore().run?.phase).toBe('duel')
    expect(runStore().loadoutId).toBe('warden')
  })
})
