import { useState } from 'react'
import type { MotionSetting, Pacing, TextSize } from '../../meta/settings.ts'
import { playSound } from '../../audio/sfx.ts'
import { useDuelStore } from '../combat/store.ts'
import { useSettingsStore } from './settings-store.ts'
import { useProfileStore } from './store.ts'

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="setting">
      <legend>{label}</legend>
      <div className="setting-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function SettingsScreen() {
  const settings = useSettingsStore((store) => store.settings)
  const change = useSettingsStore((store) => store.change)
  const { closeSettings, resetProgress } = useProfileStore.getState()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <main className="settings">
      <header className="scriptorium-header">
        <h1>Settings</h1>
        <button type="button" className="quiet" onClick={closeSettings}>
          Back
        </button>
      </header>

      <fieldset className="setting">
        <legend>Sound</legend>
        <div className="setting-options">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            aria-label="Volume"
            onChange={(event) => change({ volume: Number(event.target.value) })}
            onPointerUp={() => playSound('cast')}
          />
          <button
            type="button"
            aria-pressed={settings.muted}
            onClick={() => change({ muted: !settings.muted })}
          >
            {settings.muted ? 'Muted' : 'Mute'}
          </button>
        </div>
      </fieldset>

      <Choice<Pacing>
        label="Pause before the rival's turn"
        value={settings.pacing}
        options={[
          { value: 'calm', label: 'Calm' },
          { value: 'normal', label: 'Normal' },
          { value: 'brisk', label: 'Brisk' },
        ]}
        onChange={(pacing) => change({ pacing })}
      />

      <Choice<MotionSetting>
        label="Motion (ink splashes, shakes)"
        value={settings.motion}
        options={[
          { value: 'system', label: 'Follow my system' },
          { value: 'full', label: 'Full' },
          { value: 'reduced', label: 'Reduced' },
        ]}
        onChange={(motion) => change({ motion })}
      />

      <Choice<TextSize>
        label="Text size"
        value={settings.textSize}
        options={[
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Large' },
        ]}
        onChange={(textSize) => change({ textSize })}
      />

      <fieldset className="setting">
        <legend>Learning</legend>
        <div className="setting-options">
          <button
            type="button"
            onClick={() => {
              closeSettings()
              useDuelStore.getState().startTutorial()
            }}
          >
            Replay the tutorial
          </button>
        </div>
      </fieldset>

      <fieldset className="setting danger">
        <legend>Progress</legend>
        <div className="setting-options">
          {confirmReset ? (
            <>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  resetProgress()
                  setConfirmReset(false)
                }}
              >
                Yes, erase all progress
              </button>
              <button type="button" className="quiet" onClick={() => setConfirmReset(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)}>
              Reset progress…
            </button>
          )}
        </div>
        <p className="setting-note">
          Erases gold, unlocks, rewrites, bindings, ascension and any saved run. Settings stay.
        </p>
      </fieldset>
    </main>
  )
}
