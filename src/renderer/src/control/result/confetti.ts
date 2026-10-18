import { SCENE } from './palette'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  size: number
  rotation: number
  spin: number
  color: string
  shape: 'strip' | 'spark'
  bornAt: number
  life: number
}

const running = new WeakMap<HTMLCanvasElement, number>()
const DURATION = 2_200

/** 结果出现时喷一次彩带 + 三簇烟花；纯视觉，不参与任何结果计算。 */
export function burstConfetti(canvas: HTMLCanvasElement): void {
  const previous = running.get(canvas)
  if (previous !== undefined) cancelAnimationFrame(previous)

  const context = canvas.getContext('2d')
  if (context === null) return

  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)

  const width = rect.width
  const height = rect.height
  const colors = [SCENE.accent, SCENE.info, SCENE.bilibili, SCENE.white]
  const start = performance.now()
  const particles: Particle[] = []

  const colorAt = (index: number): string => colors[index % colors.length] ?? SCENE.accent

  for (const [index, burst] of [
    { x: width * 0.24, y: height * 0.28 },
    { x: width * 0.76, y: height * 0.24 },
    { x: width * 0.5, y: height * 0.18 }
  ].entries()) {
    const count = 42
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.14
      const speed = 2.2 + Math.random() * 3.4
      particles.push({
        x: burst.x,
        y: burst.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.045,
        drag: 0.985,
        size: 1.6 + Math.random() * 1.8,
        rotation: 0,
        spin: 0,
        color: colorAt(index + i),
        shape: 'spark',
        bornAt: start + index * 90,
        life: 900 + Math.random() * 400
      })
    }
  }

  for (let i = 0; i < 110; i += 1) {
    particles.push({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.35,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.6 + Math.random() * 2.4,
      gravity: 0.05,
      drag: 0.995,
      size: 3 + Math.random() * 4,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.16,
      color: colorAt(i),
      shape: 'strip',
      bornAt: start + Math.random() * 240,
      life: 1_500 + Math.random() * 500
    })
  }

  const frame = (now: number): void => {
    context.clearRect(0, 0, width, height)
    let alive = 0

    for (const particle of particles) {
      const age = now - particle.bornAt
      if (age < 0) {
        alive += 1
        continue
      }
      if (age > particle.life) continue
      alive += 1

      const dt = 1 / 60
      particle.vx *= particle.drag
      particle.vy = particle.vy * particle.drag + particle.gravity
      particle.x += particle.vx * dt * 60
      particle.y += particle.vy * dt * 60
      particle.rotation += particle.spin

      const alpha = Math.min(1, (particle.life - age) / 380)
      context.save()
      context.globalAlpha = Math.max(0, alpha)
      context.fillStyle = particle.color
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      if (particle.shape === 'strip') {
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
      } else {
        context.beginPath()
        context.arc(0, 0, particle.size, 0, Math.PI * 2)
        context.fill()
      }
      context.restore()
    }

    if (alive > 0 && now - start < DURATION) {
      running.set(canvas, requestAnimationFrame(frame))
      return
    }

    context.clearRect(0, 0, width, height)
    running.delete(canvas)
  }

  running.set(canvas, requestAnimationFrame(frame))
}
