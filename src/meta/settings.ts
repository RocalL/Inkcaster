// Player settings: sound, pacing, motion, text size, tutorial. Stored apart from the profile
// (its own small versioned record), so settings never touch the profile save format.

export type Pacing = 'calm' | 'normal' | 'brisk'
export type MotionSetting = 'system' | 'reduced' | 'full'
export type TextSize = 'normal' | 'large'

export interface Settings {
  /** 0 to 1. */
  volume: number
  muted: boolean
  pacing: Pacing
  motion: MotionSetting
  textSize: TextSize
  tutorialDone: boolean
}

export const SETTINGS_VERSION = 1
export const SETTINGS_KEY = 'inkcaster/settings'

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  muted: false,
  pacing: 'normal',
  motion: 'system',
  textSize: 'normal',
  tutorialDone: false,
}

/** Pause between your spell and the rival's turn, in ms. */
export const RIVAL_DELAY_MS: Record<Pacing, number> = { calm: 1100, normal: 700, brisk: 300 }

/** Reads stored settings; anything missing or invalid falls back to the default. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS }
  const stored = raw as { version?: unknown; settings?: Partial<Record<keyof Settings, unknown>> }
  if (stored.version !== SETTINGS_VERSION || typeof stored.settings !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }
  const s = stored.settings ?? {}
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback
  return {
    volume:
      typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1
        ? s.volume
        : DEFAULT_SETTINGS.volume,
    muted: typeof s.muted === 'boolean' ? s.muted : DEFAULT_SETTINGS.muted,
    pacing: pick(s.pacing, ['calm', 'normal', 'brisk'] as const, DEFAULT_SETTINGS.pacing),
    motion: pick(s.motion, ['system', 'reduced', 'full'] as const, DEFAULT_SETTINGS.motion),
    textSize: pick(s.textSize, ['normal', 'large'] as const, DEFAULT_SETTINGS.textSize),
    tutorialDone: typeof s.tutorialDone === 'boolean' ? s.tutorialDone : false,
  }
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify({ version: SETTINGS_VERSION, settings })
}

/** localStorage can throw (private windows, blocked storage); settings then live in memory. */
export function loadSettings(): Settings {
  try {
    const text = globalThis.localStorage?.getItem(SETTINGS_KEY)
    return parseSettings(text ? JSON.parse(text) : null)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, serializeSettings(settings))
  } catch {
    // Best effort.
  }
}
