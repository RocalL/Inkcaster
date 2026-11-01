// Sound effects synthesized with the Web Audio API: no files, no licences. Each sound is a few
// oscillators or a burst of filtered noise with a short envelope. The AudioContext is created
// on the first sound (browsers only allow audio after a user gesture, which every sound follows).

export type SoundId =
  | 'pick'
  | 'cast'
  | 'hit'
  | 'ward'
  | 'heal'
  | 'burn'
  | 'chill'
  | 'erase'
  | 'summon'
  | 'reward'
  | 'victory'
  | 'defeat'

let context: AudioContext | null = null
let master: GainNode | null = null
let volume = 0.6
let muted = false

export function setAudioSettings(next: { volume: number; muted: boolean }): void {
  volume = next.volume
  muted = next.muted
  if (master) master.gain.value = muted ? 0 : volume
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (muted || volume <= 0) return null
  if (!context) {
    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined
    if (!Ctor) return null
    context = new Ctor()
    master = context.createGain()
    master.gain.value = volume
    master.connect(context.destination)
  }
  if (context.state === 'suspended') void context.resume()
  return master ? { ctx: context, out: master } : null
}

/** A tone gliding from `from` to `to` Hz with a quick attack and exponential decay. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  { from, to = from, type = 'sine', at = 0, length = 0.2, gain = 0.3 }: ToneOptions,
): void {
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + length)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(env).connect(out)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

interface ToneOptions {
  from: number
  to?: number
  type?: OscillatorType
  at?: number
  length?: number
  gain?: number
}

/** Filtered white noise: quill scratches, crackles, splashes. */
function noise(
  ctx: AudioContext,
  out: AudioNode,
  { at = 0, length = 0.15, gain = 0.25, freq = 2000, q = 1, sweepTo }: NoiseOptions,
): void {
  const start = ctx.currentTime + at
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(freq, start)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + length)
  filter.Q.value = q
  const env = ctx.createGain()
  env.gain.setValueAtTime(gain, start)
  env.gain.exponentialRampToValueAtTime(0.0001, start + length)
  source.connect(filter).connect(env).connect(out)
  source.start(start)
}

interface NoiseOptions {
  at?: number
  length?: number
  gain?: number
  freq?: number
  q?: number
  sweepTo?: number
}

export function playSound(id: SoundId): void {
  const audioOut = audio()
  if (!audioOut) return
  const { ctx, out } = audioOut
  switch (id) {
    case 'pick': // a quill touching paper
      return noise(ctx, out, { length: 0.05, gain: 0.15, freq: 4500, q: 2 })
    case 'cast': // ink rushing off the page
      noise(ctx, out, { length: 0.35, gain: 0.18, freq: 600, sweepTo: 3000, q: 0.8 })
      return tone(ctx, out, { from: 220, to: 660, type: 'triangle', length: 0.3, gain: 0.12 })
    case 'hit':
      tone(ctx, out, { from: 140, to: 50, length: 0.22, gain: 0.4 })
      return noise(ctx, out, { length: 0.08, gain: 0.25, freq: 900 })
    case 'ward':
      tone(ctx, out, { from: 880, type: 'triangle', length: 0.5, gain: 0.12 })
      return tone(ctx, out, { from: 1320, type: 'sine', at: 0.04, length: 0.5, gain: 0.08 })
    case 'heal':
      return [523, 659, 784].forEach((f, i) =>
        tone(ctx, out, { from: f, type: 'sine', at: i * 0.07, length: 0.3, gain: 0.1 }),
      )
    case 'burn':
      return [0, 0.05, 0.11, 0.16].forEach((at) =>
        noise(ctx, out, { at, length: 0.05, gain: 0.2, freq: 1500 + at * 4000, q: 3 }),
      )
    case 'chill':
      return tone(ctx, out, { from: 1760, to: 1100, type: 'sine', length: 0.4, gain: 0.08 })
    case 'erase': // a firm scratch through a word
      return noise(ctx, out, { length: 0.25, gain: 0.22, freq: 3000, sweepTo: 800, q: 1.5 })
    case 'summon':
      tone(ctx, out, { from: 196, to: 392, type: 'triangle', length: 0.35, gain: 0.12 })
      return tone(ctx, out, {
        from: 294,
        to: 588,
        type: 'sine',
        at: 0.08,
        length: 0.35,
        gain: 0.08,
      })
    case 'reward':
      return [659, 880].forEach((f, i) =>
        tone(ctx, out, { from: f, type: 'triangle', at: i * 0.1, length: 0.35, gain: 0.12 }),
      )
    case 'victory':
      return [523, 659, 784, 1047].forEach((f, i) =>
        tone(ctx, out, { from: f, type: 'triangle', at: i * 0.12, length: 0.5, gain: 0.12 }),
      )
    case 'defeat':
      return [392, 330, 262, 196].forEach((f, i) =>
        tone(ctx, out, { from: f, type: 'sine', at: i * 0.18, length: 0.6, gain: 0.12 }),
      )
  }
}
