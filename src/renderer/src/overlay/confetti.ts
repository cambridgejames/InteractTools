import { SCENE } from './palette'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
  life: number
}

/** 只在结果出现时喷一次；1.4 秒后自动停止。 */
export function burstConfetti(canvas: HTMLCanvasElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const context = canvas.getContext('2d')
  if (context === null) return

  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  const colors = [SCENE.accent, SCENE.info, SCENE.bilibili, SCENE.white]
  const particles: Particle[] = []
  for (let index = 0; index < 90; index += 1) {
    particles.push({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height / 2 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 520,
      vy: -220 - Math.random() * 360,
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)] ?? SCENE.accent,
      life: 0
    })
  }

  let last = performance.now()
  let frame = 0

  const tick = (now: number): void => {
    const delta = Math.min(0.05, (now - last) / 1000)
    last = now
    frame += delta
    context.clearRect(0, 0, width, height)

    for (const particle of particles) {
      particle.life += delta
      particle.vy += 680 * delta
      particle.vx *= 0.995
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      particle.rotation += particle.spin * delta

      context.save()
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      context.globalAlpha = Math.max(0, 1 - frame / 1.4)
      context.fillStyle = particle.color
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6)
      context.restore()
    }

    if (frame < 1.4) {
      requestAnimationFrame(tick)
    } else {
      context.clearRect(0, 0, width, height)
    }
  }

  requestAnimationFrame(tick)
}
