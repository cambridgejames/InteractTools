import { describe, expect, it } from 'vitest'
import { simulateDice } from '@tools/dice/physics/simulate'

describe('dice simulation', () => {
  it('is deterministic for the same seed', () => {
    const first = simulateDice({ faces: 6, power: 62, seed: 12345 })
    const second = simulateDice({ faces: 6, power: 62, seed: 12345 })
    expect(second.value).toBe(first.value)
    expect(second.frames.length).toBe(first.frames.length)
    expect(second.settled).toBe(first.settled)
  })

  it('settles and returns a valid face', () => {
    const result = simulateDice({ faces: 6, power: 80, seed: 42 })
    expect(result.value).toBeGreaterThanOrEqual(1)
    expect(result.value).toBeLessThanOrEqual(6)
    expect(result.frames.length).toBeGreaterThan(10)
    expect(result.settled).toBe(true)

    for (const frame of result.frames) {
      const [x, y, z, w] = frame.quaternion
      expect(Number.isFinite(x + y + z + w)).toBe(true)
      expect(Math.hypot(x, y, z, w)).toBeCloseTo(1, 3)
    }
  })

  it('launches at 100 power and still settles', () => {
    const result = simulateDice({ faces: 6, power: 100, seed: 10 })
    expect(result.settled).toBe(true)
    expect(result.frames.length).toBeGreaterThan(10)
    expect(result.value).toBeGreaterThanOrEqual(1)
    expect(result.value).toBeLessThanOrEqual(6)
  })

  it('settles a d20 across representative launches', () => {
    for (const power of [20, 65, 100]) {
      for (const seed of [1, 7, 42]) {
        const result = simulateDice({ faces: 20, power, seed })
        expect(result.settled, 'd20 power ' + String(power) + ' seed ' + String(seed)).toBe(true)
      }
    }
  })

  it('reads the bottom face of a d4', () => {
    const result = simulateDice({ faces: 4, power: 55, seed: 7 })
    expect(result.value).toBeGreaterThanOrEqual(1)
    expect(result.value).toBeLessThanOrEqual(4)
  })
})
