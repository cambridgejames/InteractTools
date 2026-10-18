import { describe, expect, it } from 'vitest'
import { DICE_FACES } from '@contracts/dice'
import { getDiceGeometry } from '@tools/dice/physics/geometry'

describe('dice geometry', () => {
  it.each(DICE_FACES)('builds %i faces', (faces) => {
    const geometry = getDiceGeometry(faces)
    expect(geometry.polygons).toHaveLength(faces)
    const expected = { 4: 4, 6: 8, 8: 6, 10: 7, 12: 20, 20: 12 } as const
    expect(geometry.vertices).toHaveLength(expected[faces])
  })

  it('d6 opposite numbers add to 7', () => {
    const geometry = getDiceGeometry(6)
    const byNormal = new Map(
      geometry.polygons.map((face) => [
        [Math.round(face.normal.x), Math.round(face.normal.y), Math.round(face.normal.z)].join(','),
        face.number
      ])
    )

    for (const [key, value] of byNormal) {
      const [x, y, z] = key.split(',').map(Number)
      const opposite = [-(x ?? 0), -(y ?? 0), -(z ?? 0)].join(',')
      expect(value + (byNormal.get(opposite) ?? 0)).toBe(7)
    }
  })

  it('d10 numbers are unique 0-9', () => {
    const numbers = getDiceGeometry(10).polygons.map((face) => face.number).sort((a, b) => a - b)
    expect(numbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
