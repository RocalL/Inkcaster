import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  parseSettings,
  serializeSettings,
} from '../../src/meta/settings.ts'

describe('settings', () => {
  it('round-trips', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      volume: 0.2,
      pacing: 'brisk' as const,
      tutorialDone: true,
    }
    expect(parseSettings(JSON.parse(serializeSettings(settings)))).toEqual(settings)
  })

  it('falls back to defaults for missing, invalid or other-version data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ version: SETTINGS_VERSION + 1, settings: {} })).toEqual(DEFAULT_SETTINGS)
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        settings: { volume: 7, pacing: 'warp', muted: true },
      }),
    ).toEqual({ ...DEFAULT_SETTINGS, muted: true })
  })
})
