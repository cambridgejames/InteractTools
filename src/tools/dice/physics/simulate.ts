import { Body, ContactMaterial, ConvexPolyhedron, Material, Plane, Vec3, World } from 'cannon-es'
import type { DiceFaces } from '@contracts/dice'
import type { DiceFrame } from '@contracts/presentation'
import { createSeededRandom } from '@contracts/random'
import { getDiceGeometry, type DiceGeometry } from './geometry'

export interface DiceSimulationInput {
  readonly faces: DiceFaces
  /** 0–100，只改变初始能量，不参与选面。 */
  readonly power: number
  readonly seed: number
}

export interface DiceSimulationResult {
  readonly value: number
  readonly frames: readonly DiceFrame[]
  readonly frameSeconds: number
  readonly settled: boolean
  readonly settleSeconds: number
  readonly seed: number
}

const FIXED_STEP = 1 / 120
const RECORD_EVERY = 2
const FRAME_SECONDS = FIXED_STEP * RECORD_EVERY
const MAX_SECONDS = 10
const MIN_SETTLE_SECONDS = 1
const NUDGE_SECONDS = 3
const STABLE_STEPS_REQUIRED = 30

/**
 * 用 cannon-es 跑一次真实刚体投掷。
 *
 * 纯函数：不读时钟、不写日志、不碰配置。相同输入必须得到相同结果，
 * overlay 回放的逐帧位姿就是这里录下来的。
 */
export function simulateDice(input: DiceSimulationInput): DiceSimulationResult {
  const geometry = getDiceGeometry(input.faces)
  const rng = createSeededRandom(input.seed)
  const world = createWorld()
  const body = createDiceBody(geometry, input.power, rng)

  world.addBody(body)

  const frames: DiceFrame[] = []
  let stableSteps = 0
  let settleStep = -1
  let nudged = false
  const maxSteps = Math.ceil(MAX_SECONDS / FIXED_STEP)

  for (let step = 0; step < maxSteps; step += 1) {
    world.step(FIXED_STEP)

    if (step % RECORD_EVERY === 0) frames.push(snapshot(body))

    const seconds = (step + 1) * FIXED_STEP
    if (seconds < MIN_SETTLE_SECONDS) continue

    // 偶尔会停在棱上：低速但没有面朝上时轻推一次，让它倒向某一面。
    if (
      !nudged &&
      seconds > NUDGE_SECONDS &&
      body.velocity.length() < 0.25 &&
      body.angularVelocity.length() < 0.7 &&
      upwardness(geometry, body.quaternion) < 0.92
    ) {
      body.applyImpulse(
        new Vec3((rng.next() - 0.5) * 0.5, 0.35, (rng.next() - 0.5) * 0.5)
      )
      body.angularVelocity.x += (rng.next() - 0.5) * 1.4
      body.angularVelocity.z += (rng.next() - 0.5) * 1.4
      nudged = true
    }

    if (isStable(body, geometry)) {
      stableSteps += 1
      if (stableSteps >= STABLE_STEPS_REQUIRED) {
        settleStep = step
        break
      }
    } else {
      stableSteps = 0
    }
  }

  if (frames.length === 0 || settleStep >= 0) frames.push(snapshot(body))

  const value = readFace(geometry, body.quaternion, input.faces)
  return {
    value,
    frames,
    frameSeconds: FRAME_SECONDS,
    settled: settleStep >= 0,
    settleSeconds: settleStep >= 0 ? (settleStep + 1) * FIXED_STEP : MAX_SECONDS,
    seed: input.seed
  }
}

function createWorld(): World {
  const world = new World({ gravity: new Vec3(0, -24, 0) })
  const tableMaterial = new Material('table')
  const diceMaterial = new Material('dice')
  const table = new Body({ mass: 0, shape: new Plane(), material: tableMaterial })

  // Plane 的法线默认是 +Z，绕 X 轴转 -90° 后朝上。
  table.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(table)
  world.addContactMaterial(
    new ContactMaterial(diceMaterial, tableMaterial, {
      friction: 0.42,
      restitution: 0.26
    })
  )

  // 八边形隐形挡边：让骰子留在镜头和台面内，避免高力度时滚出画面。
  for (let index = 0; index < 8; index += 1) {
    const angle = (index * Math.PI) / 4
    const inward = new Vec3(-Math.cos(angle), 0, -Math.sin(angle))
    const wall = new Body({ mass: 0, shape: new Plane() })
    wall.position.set(Math.cos(angle) * 3.2, 0, Math.sin(angle) * 3.2)
    wall.quaternion.setFromVectors(new Vec3(0, 0, 1), inward)
    world.addBody(wall)
  }

  world.defaultContactMaterial.friction = 0.42
  world.defaultContactMaterial.restitution = 0.26
  return world
}

function createDiceBody(
  geometry: DiceGeometry,
  power: number,
  rng: { next(): number }
): Body {
  const shape = new ConvexPolyhedron({
    vertices: geometry.vertices.map((point) => new Vec3(point.x, point.y, point.z)),
    faces: geometry.polygons.map((face) => [...face.indices])
  })

  const position = new Vec3((rng.next() - 0.5) * 2.4, 5.2 + rng.next() * 1.4, (rng.next() - 0.5) * 2.4)
  const body = new Body({ mass: 1, shape, position })

  body.quaternion.setFromEuler(
    rng.next() * Math.PI * 2,
    rng.next() * Math.PI * 2,
    rng.next() * Math.PI * 2
  )

  const horizontal = 0.8 + power * 0.045
  body.velocity.set(
    (rng.next() - 0.5) * horizontal,
    -(1.4 + power * 0.03),
    (rng.next() - 0.5) * horizontal
  )

  const axis = new Vec3(rng.next() * 2 - 1, rng.next() * 2 - 1, rng.next() * 2 - 1)
  const axisLength = axis.length() || 1
  const spin = 2.4 + power * 0.21
  body.angularVelocity.set(
    (axis.x / axisLength) * spin,
    (axis.y / axisLength) * spin,
    (axis.z / axisLength) * spin
  )

  body.linearDamping = 0.06
  body.angularDamping = 0.08
  return body
}

function isStable(body: Body, geometry: DiceGeometry): boolean {
  if (body.velocity.length() > 0.08) return false
  if (body.angularVelocity.length() > 0.12) return false
  return upwardness(geometry, body.quaternion) > 0.92
}

/**
 * d4 读贴地那一面，其余读朝上一面；返回 0–1 的“正对程度”。
 */
function upwardness(geometry: DiceGeometry, rotation: Body['quaternion']): number {
  const isTetrahedron = geometry.faces === 4
  let best = isTetrahedron ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY

  for (const face of geometry.polygons) {
    const normal = rotation.vmult(
      new Vec3(face.normal.x, face.normal.y, face.normal.z),
      new Vec3()
    )
    if (isTetrahedron) {
      best = Math.min(best, normal.y)
    } else {
      best = Math.max(best, normal.y)
    }
  }

  return isTetrahedron ? -best : best
}

function readFace(
  geometry: DiceGeometry,
  rotation: Body['quaternion'],
  faces: DiceFaces
): number {
  const isTetrahedron = faces === 4
  let bestIndex = 0
  let best = isTetrahedron ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY

  geometry.polygons.forEach((face, index) => {
    const normal = rotation.vmult(
      new Vec3(face.normal.x, face.normal.y, face.normal.z),
      new Vec3()
    )
    if (isTetrahedron ? normal.y < best : normal.y > best) {
      best = normal.y
      bestIndex = index
    }
  })

  return geometry.polygons[bestIndex]?.number ?? 1
}

function snapshot(body: Body): DiceFrame {
  return {
    position: [body.position.x, body.position.y, body.position.z],
    quaternion: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w]
  }
}
