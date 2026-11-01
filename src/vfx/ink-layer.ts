// A lightweight canvas layer for ink splashes, drawn over the page with pointer-events off.
// The animation loop only runs while particles are alive, so an idle duel costs nothing.

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  color: string
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let frame: number | null = null
let enabled = true

/** Turned off for reduced motion. */
export function setInkEnabled(value: boolean): void {
  enabled = value
  if (!value) particles = []
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (ctx && canvas?.isConnected) return ctx
  canvas = document.createElement('canvas')
  canvas.className = 'ink-layer'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  return ctx
}

function resize(): void {
  if (!canvas) return
  const ratio = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * ratio
  canvas.height = window.innerHeight * ratio
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
}

/** Splashes ink droplets from a point (viewport coordinates). */
export function splash(x: number, y: number, color: string, count = 14, force = 1): void {
  if (!enabled || !ensureCanvas()) return
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (1.5 + Math.random() * 4) * force
    const maxLife = 30 + Math.random() * 25
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      radius: 1.5 + Math.random() * 3.5 * force,
      life: maxLife,
      maxLife,
      color,
    })
  }
  if (frame === null) frame = requestAnimationFrame(tick)
}

/** Splashes from the centre of an element. */
export function splashAt(element: Element | null, color: string, count?: number, force?: number) {
  if (!element) return
  const rect = element.getBoundingClientRect()
  splash(rect.left + rect.width / 2, rect.top + rect.height / 2, color, count, force)
}

function tick(): void {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const p of particles) {
    p.vy += 0.18
    p.vx *= 0.97
    p.x += p.vx
    p.y += p.vy
    p.life -= 1
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  particles = particles.filter((p) => p.life > 0)
  frame = particles.length > 0 ? requestAnimationFrame(tick) : null
  if (frame === null) ctx.clearRect(0, 0, canvas.width, canvas.height)
}
