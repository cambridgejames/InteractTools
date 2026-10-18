import type { RandomSource } from '@contracts/time'

export { createSeededRandom } from '@contracts/random'

export class MathRandom implements RandomSource {
  next(): number {
    return Math.random()
  }
}
