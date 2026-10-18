import type { DiceFaces } from '@contracts/dice'

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface DiceFace {
  readonly indices: readonly number[]
  readonly normal: Vec3
  readonly centroid: Vec3
  readonly number: number
}

export interface DiceGeometry {
  readonly faces: DiceFaces
  readonly vertices: readonly Vec3[]
  readonly polygons: readonly DiceFace[]
}

const DICE_RADIUS = 1.1
const EPSILON = 1e-5

const cache = new Map<DiceFaces, DiceGeometry>()

/** 骰子几何是静态的，首次使用时构建并缓存。 */
export function getDiceGeometry(faces: DiceFaces): DiceGeometry {
  const cached = cache.get(faces)
  if (cached !== undefined) return cached

  const raw = rawVertices(faces)
  const vertices = normalize(raw, DICE_RADIUS)
  const polygons = assignNumbers(faces, convexFaces(vertices))

  if (polygons.length !== faces) {
    throw new Error('骰子面数不匹配：期望 ' + faces + '，得到 ' + polygons.length)
  }

  const geometry: DiceGeometry = { faces, vertices, polygons }
  cache.set(faces, geometry)
  return geometry
}

function rawVertices(faces: DiceFaces): readonly Vec3[] {
  switch (faces) {
    case 4:
      return [
        v(1, 1, 1),
        v(1, -1, -1),
        v(-1, 1, -1),
        v(-1, -1, 1)
      ]
    case 6:
      return [
        v(-1, -1, -1),
        v(1, -1, -1),
        v(1, 1, -1),
        v(-1, 1, -1),
        v(-1, -1, 1),
        v(1, -1, 1),
        v(1, 1, 1),
        v(-1, 1, 1)
      ]
    case 8:
      return [v(1, 0, 0), v(-1, 0, 0), v(0, 1, 0), v(0, -1, 0), v(0, 0, 1), v(0, 0, -1)]
    case 10:
      return decahedron()
    case 12:
      return dodecahedron()
    case 20:
      return icosahedron()
  }
}

/**
 * d10 用五角双锥：上下两个顶点 + 中间五边形。
 *
 * 标准五角偏方面体（trapezohedron）的斜方肌面需要满足额外的
 * 半径/高度关系，否则不是平面；双锥是同样有 10 个面的可滚动
 * 凸多面体，物理与读数都稳定。
 */
function decahedron(): readonly Vec3[] {
  const apex = 1.28
  const radius = 1
  const points: Vec3[] = [v(0, apex, 0), v(0, -apex, 0)]

  for (let i = 0; i < 5; i += 1) {
    const angle = (i * Math.PI * 2) / 5
    points.push(v(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }

  return points
}

function dodecahedron(): readonly Vec3[] {
  const phi = (1 + Math.sqrt(5)) / 2
  const inverse = 1 / phi
  const points: Vec3[] = []

  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        points.push(v(x, y, z))
      }
    }
  }
  const extra: Vec3[] = [
    v(0, inverse, phi),
    v(0, inverse, -phi),
    v(0, -inverse, phi),
    v(0, -inverse, -phi),
    v(inverse, phi, 0),
    v(-inverse, phi, 0),
    v(inverse, -phi, 0),
    v(-inverse, -phi, 0),
    v(phi, 0, inverse),
    v(phi, 0, -inverse),
    v(-phi, 0, inverse),
    v(-phi, 0, -inverse)
  ]

  return [...points, ...extra]
}

function icosahedron(): readonly Vec3[] {
  const phi = (1 + Math.sqrt(5)) / 2
  const points: Vec3[] = []

  for (const a of [-1, 1]) {
    for (const b of [-phi, phi]) {
      points.push(v(0, a, b))
      points.push(v(a, b, 0))
      points.push(v(b, 0, a))
    }
  }

  return points
}

function convexFaces(vertices: readonly Vec3[]): readonly DiceFace[] {
  const faces = new Map<string, DiceFace>()

  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const a = vertices[i]
        const b = vertices[j]
        const c = vertices[k]
        if (a === undefined || b === undefined || c === undefined) continue

        let normal = cross(subtract(b, a), subtract(c, a))
        const length = magnitude(normal)
        if (length < EPSILON) continue
        normal = scale(normal, 1 / length)

        const distance = dot(normal, a)
        if (distance < 0) {
          normal = scale(normal, -1)
        }
        const offset = Math.abs(distance)
        if (offset < EPSILON) continue

        if (vertices.some((point) => dot(normal, point) > offset + 1e-5)) continue

        const indices = vertices
          .map((point, index) => ({ index, delta: Math.abs(dot(normal, point) - offset) }))
          .filter((entry) => entry.delta < 1e-4)
          .map((entry) => entry.index)

        if (indices.length < 3) continue

        const key = [
          Math.round(normal.x * 1e4),
          Math.round(normal.y * 1e4),
          Math.round(normal.z * 1e4),
          Math.round(offset * 1e4)
        ].join(':')

        if (faces.has(key)) continue

        const ordered = orderFace(vertices, indices, normal)
        if (ordered.length < 3) continue

        faces.set(key, {
          indices: ordered,
          normal,
          centroid: centroidOf(vertices, ordered),
          number: 0
        })
      }
    }
  }

  return [...faces.values()].sort((a, b) => {
    const byY = b.normal.y - a.normal.y
    if (Math.abs(byY) > 1e-9) return byY
    return Math.atan2(a.normal.z, a.normal.x) - Math.atan2(b.normal.z, b.normal.x)
  })
}

function orderFace(vertices: readonly Vec3[], indices: readonly number[], normal: Vec3): number[] {
  const centroid = centroidOf(vertices, indices)
  const first = vertices[indices[0] ?? -1]
  if (first === undefined) return []

  const u = normalizeVector(subtract(first, centroid))
  const w = cross(normal, u)

  return [...indices].sort((left, right) => {
    const a = vertices[left]
    const b = vertices[right]
    if (a === undefined || b === undefined) return 0
    const angleA = Math.atan2(dot(subtract(a, centroid), w), dot(subtract(a, centroid), u))
    const angleB = Math.atan2(dot(subtract(b, centroid), w), dot(subtract(b, centroid), u))
    return angleA - angleB
  })
}

function assignNumbers(faces: DiceFaces, polygons: readonly DiceFace[]): readonly DiceFace[] {
  if (faces === 6) {
    const mapping = new Map<string, number>()
    mapping.set(axisKey(0, 1, 0), 1)
    mapping.set(axisKey(0, -1, 0), 6)
    mapping.set(axisKey(1, 0, 0), 2)
    mapping.set(axisKey(-1, 0, 0), 5)
    mapping.set(axisKey(0, 0, 1), 3)
    mapping.set(axisKey(0, 0, -1), 4)

    return polygons.map((face) => ({
      ...face,
      number: mapping.get(axisKey(face.normal.x, face.normal.y, face.normal.z)) ?? 0
    }))
  }

  if (faces === 10) {
    return polygons.map((face, index) => ({ ...face, number: index % 10 }))
  }

  return polygons.map((face, index) => ({ ...face, number: index + 1 }))
}

function axisKey(x: number, y: number, z: number): string {
  const axis = (value: number): number => (value > 0.5 ? 1 : value < -0.5 ? -1 : 0)
  return axis(x) + ':' + axis(y) + ':' + axis(z)
}

function normalize(vertices: readonly Vec3[], radius: number): readonly Vec3[] {
  const longest = Math.max(...vertices.map((point) => magnitude(point)))
  const factor = longest === 0 ? 1 : radius / longest
  return vertices.map((point) => scale(point, factor))
}

function centroidOf(vertices: readonly Vec3[], indices: readonly number[]): Vec3 {
  let x = 0
  let y = 0
  let z = 0
  let count = 0

  for (const index of indices) {
    const point = vertices[index]
    if (point === undefined) continue
    x += point.x
    y += point.y
    z += point.z
    count += 1
  }

  return count === 0 ? v(0, 0, 0) : v(x / count, y / count, z / count)
}

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return v(a.x - b.x, a.y - b.y, a.z - b.z)
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function magnitude(value: Vec3): number {
  return Math.hypot(value.x, value.y, value.z)
}

function normalizeVector(value: Vec3): Vec3 {
  const length = magnitude(value)
  return length < EPSILON ? v(0, 0, 0) : scale(value, 1 / length)
}

function scale(value: Vec3, factor: number): Vec3 {
  return v(value.x * factor, value.y * factor, value.z * factor)
}
