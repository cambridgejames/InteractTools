import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { DiceFrame, DiceMesh, DiceMeshFace } from '@contracts/presentation'
import { SCENE } from './palette'

const FACE_SIZE = 256

/** 3D 舞台：只回放主进程录制的位姿，不做任何物理计算。 */
export class DiceScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly resizeObserver: ResizeObserver
  private dice: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial[]> | null = null
  private geometry: THREE.BufferGeometry | null = null
  private materials: THREE.MeshStandardMaterial[] = []
  private textures: THREE.Texture[] = []
  private contactShadow: THREE.Mesh | null = null
  private frames: readonly DiceFrame[] = []
  private frameSeconds = 1 / 60
  private mountedFaces = 0
  private startedAt = 0
  private raf = 0
  private finishTimer: number | null = null
  private finished = false

  constructor(
    private readonly container: HTMLElement,
    private readonly onFinished: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.className = 'dice-canvas'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    this.camera.position.set(0, 3.8, 7.6)
    this.camera.lookAt(0, 1.0, 0)

    this.setupStage()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  play(payload: { readonly mesh: DiceMesh; readonly frames: readonly DiceFrame[]; readonly frameSeconds: number }): void {
    if (this.mountedFaces !== payload.mesh.faces.length) {
      this.buildDice(payload.mesh)
    }

    this.cancelFinish()
    cancelAnimationFrame(this.raf)
    this.frames = payload.frames
    this.frameSeconds = payload.frameSeconds
    this.finished = false
    this.startedAt = performance.now()

    const first = this.frames[0]
    if (first !== undefined) this.applyFrame(first)
    this.renderer.render(this.scene, this.camera)

    if (this.frames.length === 0) {
      this.scheduleFinish(0)
      return
    }

    this.raf = requestAnimationFrame(this.tick)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.cancelFinish()
    this.resizeObserver.disconnect()
    this.disposeDice()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private readonly tick = (now: number): void => {
    const elapsed = (now - this.startedAt) / 1000
    const index = Math.min(this.frames.length - 1, Math.floor(elapsed / this.frameSeconds))
    const frame = this.frames[index]
    if (frame !== undefined) this.applyFrame(frame)
    this.renderer.render(this.scene, this.camera)

    if (index >= this.frames.length - 1) {
      if (!this.finished) {
        this.finished = true
        this.scheduleFinish(320)
      }
      return
    }

    this.raf = requestAnimationFrame(this.tick)
  }

  private applyFrame(frame: DiceFrame): void {
    if (this.dice === null) return
    this.dice.position.set(frame.position[0], frame.position[1], frame.position[2])
    this.dice.quaternion.set(frame.quaternion[0], frame.quaternion[1], frame.quaternion[2], frame.quaternion[3])
    this.updateCamera(frame.position[1])

    if (this.contactShadow !== null) {
      this.contactShadow.position.set(frame.position[0], 0.006, frame.position[2])
      const height = Math.max(0, frame.position[1] - 0.6)
      const fade = Math.max(0.08, 0.3 - height * 0.04)
      const material = this.contactShadow.material
      if (material instanceof THREE.MeshBasicMaterial) material.opacity = fade
      const scale = 1 + height * 0.12
      this.contactShadow.scale.set(scale, scale, 1)
    }
  }

  private setupStage(): void {
    const hemisphere = new THREE.HemisphereLight(0x9aa7b8, 0x08090b, 0.9)
    this.scene.add(hemisphere)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.14))

    const key = new THREE.DirectionalLight(0xffffff, 2.8)
    key.position.set(4, 9, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 28
    key.shadow.camera.left = -7
    key.shadow.camera.right = 7
    key.shadow.camera.top = 7
    key.shadow.camera.bottom = -7
    key.shadow.bias = -0.0004
    this.scene.add(key)

    const rim = new THREE.PointLight(0xc8ff3d, 7, 14, 2)
    rim.position.set(-4, 2.4, -3.5)
    this.scene.add(rim)

    const fill = new THREE.PointLight(0x64d8ff, 2.4, 12, 2)
    fill.position.set(4.5, 1.5, 4)
    this.scene.add(fill)

    const tableMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(SCENE.table),
      roughness: 0.88,
      metalness: 0.06
    })
    const traySize = 7.2
    const trayHalf = traySize / 2
    const wallThickness = 0.18
    const wallHeight = 0.6

    const table = new THREE.Mesh(new THREE.BoxGeometry(traySize, 0.24, traySize), tableMaterial)
    table.position.y = -0.12
    table.receiveShadow = true
    this.scene.add(table)

    // 地面网格 + 垂直发射导轨：镜头拉高后仍有高度参照，能看出骰子确实在“冲天”。
    const grid = new THREE.GridHelper(
      24,
      24,
      new THREE.Color(SCENE.tableEdge),
      new THREE.Color(SCENE.table)
    )
    grid.position.y = 0.002
    const gridMaterial = grid.material
    if (gridMaterial instanceof THREE.LineBasicMaterial) {
      gridMaterial.transparent = true
      gridMaterial.opacity = 0.08
    }
    this.scene.add(grid)

    const longWall = new THREE.BoxGeometry(traySize, wallHeight, wallThickness)
    const shortWall = new THREE.BoxGeometry(wallThickness, wallHeight, traySize)
    for (const z of [-1, 1]) {
      const wall = new THREE.Mesh(longWall, tableMaterial)
      wall.position.set(0, wallHeight / 2, z * (trayHalf - wallThickness / 2))
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
    }
    for (const x of [-1, 1]) {
      const wall = new THREE.Mesh(shortWall, tableMaterial)
      wall.position.set(x * (trayHalf - wallThickness / 2), wallHeight / 2, 0)
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
    }

    // 发射台：让“从地面弹射”这件事在画面里有明确锚点。
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.72, 0.12, 48),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(SCENE.table),
        roughness: 0.55,
        metalness: 0.25,
        emissive: new THREE.Color(SCENE.tableEdge),
        emissiveIntensity: 0.12
      })
    )
    pad.position.y = 0.06
    pad.receiveShadow = true
    pad.castShadow = true
    this.scene.add(pad)

    const padRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(SCENE.tableEdge), transparent: true, opacity: 0.8 })
    )
    padRing.rotation.x = Math.PI / 2
    padRing.position.y = 0.14
    this.scene.add(padRing)

    const rail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.16, 0),
        new THREE.Vector3(0, 20, 0)
      ]),
      new THREE.LineDashedMaterial({
        color: new THREE.Color(SCENE.tableEdge),
        transparent: true,
        opacity: 0.22,
        dashSize: 0.16,
        gapSize: 0.22
      })
    )
    rail.computeLineDistances()
    this.scene.add(rail)

    for (const height of [3, 6, 9, 12]) {
      const marker = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.012, 6, 48),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(SCENE.tableEdge),
          transparent: true,
          opacity: 0.18
        })
      )
      marker.rotation.x = Math.PI / 2
      marker.position.y = height
      this.scene.add(marker)
    }

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(SCENE.tableEdge),
      transparent: true,
      opacity: 0.45
    })
    const longEdge = new THREE.BoxGeometry(traySize, 0.02, 0.02)
    const shortEdge = new THREE.BoxGeometry(0.02, 0.02, traySize)
    for (const z of [-1, 1]) {
      const edge = new THREE.Mesh(longEdge, edgeMaterial)
      edge.position.set(0, wallHeight + 0.01, z * (trayHalf - wallThickness / 2))
      this.scene.add(edge)
    }
    for (const x of [-1, 1]) {
      const edge = new THREE.Mesh(shortEdge, edgeMaterial)
      edge.position.set(x * (trayHalf - wallThickness / 2), wallHeight + 0.01, 0)
      this.scene.add(edge)
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 48),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.28,
        depthWrite: false
      })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.006
    this.scene.add(shadow)
    this.contactShadow = shadow

  }

  private updateCamera(y: number): void {
    const height = Math.max(0, y - 0.8)
    // 镜头随高度上升并后拉：骰子越高，地面/发射台越远，形成“冲天”的纵深感。
    this.camera.position.set(0, 4.0 + height * 0.5, 8.2 + height * 1.1)
    this.camera.lookAt(0, 0.8 + height * 0.5, 0)
  }

  private buildDice(mesh: DiceMesh): void {
    this.disposeDice()

    const built = buildDiceGeometry(mesh, this.renderer)
    const dice = new THREE.Mesh(built.geometry, built.materials)
    dice.castShadow = true
    dice.receiveShadow = true
    this.scene.add(dice)

    this.dice = dice
    this.geometry = built.geometry
    this.materials = built.materials
    this.textures = built.textures
    this.mountedFaces = mesh.faces.length
  }

  private disposeDice(): void {
    if (this.dice !== null) {
      this.scene.remove(this.dice)
      this.dice = null
    }
    this.geometry?.dispose()
    this.geometry = null
    for (const material of this.materials) material.dispose()
    this.materials = []
    for (const texture of this.textures) texture.dispose()
    this.textures = []
  }

  private scheduleFinish(delayMs: number): void {
    this.cancelFinish()
    this.finishTimer = window.setTimeout(() => {
      this.finishTimer = null
      this.onFinished()
    }, delayMs)
  }

  private cancelFinish(): void {
    if (this.finishTimer !== null) {
      clearTimeout(this.finishTimer)
      this.finishTimer = null
    }
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }
}

interface BuiltDice {
  readonly geometry: THREE.BufferGeometry
  readonly materials: THREE.MeshStandardMaterial[]
  readonly textures: THREE.CanvasTexture[]
}

function buildDiceGeometry(mesh: DiceMesh, renderer: THREE.WebGLRenderer): BuiltDice {
  if (mesh.faces.length === 6) return buildRoundedD6(mesh, renderer)

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  const textures: THREE.CanvasTexture[] = []
  const geometry = new THREE.BufferGeometry()

  mesh.faces.forEach((face, faceIndex) => {
    const built = faceTriangles(mesh, face)
    if (built === null) return

    const start = positions.length / 3
    for (const triangle of built.triangles) {
      for (const point of triangle.points) {
        positions.push(point.x, point.y, point.z)
        normals.push(built.normal.x, built.normal.y, built.normal.z)
        uvs.push(point.u, point.v)
      }
    }
    geometry.addGroup(start, positions.length / 3 - start, faceIndex)

    const texture = createFaceTexture(face.number, mesh.faces.length, renderer)
    textures.push(texture)
    materials.push(
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.58,
        metalness: 0.04
      })
    )
  })

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeBoundingSphere()

  return { geometry, materials, textures }
}

function buildRoundedD6(mesh: DiceMesh, renderer: THREE.WebGLRenderer): BuiltDice {
  // BoxGeometry 的 group 顺序是 +X/-X/+Y/-Y/+Z/-Z；倒角只改视觉，物理仍是原凸包。
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ]
  const geometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.09)
  geometry.scale(1.27, 1.27, 1.27)

  const materials: THREE.MeshStandardMaterial[] = []
  const textures: THREE.CanvasTexture[] = []
  const assigned = new Set<number>()

  for (const face of mesh.faces) {
    const points = face.indices.map((index) => mesh.vertices[index]).filter((point) => point !== undefined)
    const a = points[0]
    const b = points[1]
    const c = points[2]
    if (a === undefined || b === undefined || c === undefined) continue

    const normal = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z)
      .cross(new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z))
      .normalize()
    const centroid = new THREE.Vector3(
      points.reduce((sum, point) => sum + point.x, 0) / points.length,
      points.reduce((sum, point) => sum + point.y, 0) / points.length,
      points.reduce((sum, point) => sum + point.z, 0) / points.length
    )
    if (normal.dot(centroid) < 0) normal.negate()

    const slot = axes.findIndex((axis) => axis.dot(normal) > 0.9)
    if (slot < 0 || assigned.has(slot)) continue
    assigned.add(slot)

    const texture = createFaceTexture(face.number, 6, renderer)
    textures.push(texture)
    materials[slot] = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.58,
      metalness: 0.04
    })
  }

  for (let slot = 0; slot < 6; slot += 1) {
    if (materials[slot] === undefined) {
      materials[slot] = new THREE.MeshStandardMaterial({ color: new THREE.Color(SCENE.faceDark) })
    }
  }

  geometry.computeBoundingSphere()
  return { geometry, materials, textures }
}

function faceTriangles(
  mesh: DiceMesh,
  face: DiceMeshFace
): { triangles: { points: { x: number; y: number; z: number; u: number; v: number }[] }[]; normal: THREE.Vector3 } | null {
  const points = face.indices.map((index) => mesh.vertices[index]).filter((point) => point !== undefined)
  if (points.length < 3) return null

  const a = new THREE.Vector3(points[0]?.x ?? 0, points[0]?.y ?? 0, points[0]?.z ?? 0)
  const b = new THREE.Vector3(points[1]?.x ?? 0, points[1]?.y ?? 0, points[1]?.z ?? 0)
  const c = new THREE.Vector3(points[2]?.x ?? 0, points[2]?.y ?? 0, points[2]?.z ?? 0)

  const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
  const centroid = new THREE.Vector3()
  for (const point of points) centroid.add(new THREE.Vector3(point.x, point.y, point.z))
  centroid.divideScalar(points.length)
  if (normal.dot(centroid) < 0) normal.negate()

  // 用第一条边做 U 轴，纹理才与面的边对齐；用质心方向会把点数旋转 45°。
  const tangent = new THREE.Vector3().subVectors(b, a).normalize()
  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize()

  const projected = points.map((point) => {
    const vector = new THREE.Vector3(point.x, point.y, point.z).sub(centroid)
    return { point, u: vector.dot(tangent), v: vector.dot(bitangent) }
  })
  const maxU = Math.max(...projected.map((entry) => Math.abs(entry.u)), 0.0001)
  const maxV = Math.max(...projected.map((entry) => Math.abs(entry.v)), 0.0001)

  const uv = projected.map((entry) => ({
    x: entry.point.x,
    y: entry.point.y,
    z: entry.point.z,
    u: 0.5 + (entry.u / maxU) * 0.46,
    v: 0.5 - (entry.v / maxV) * 0.46
  }))

  const triangles: { points: { x: number; y: number; z: number; u: number; v: number }[] }[] = []
  for (let index = 1; index < uv.length - 1; index += 1) {
    const first = uv[0]
    const second = uv[index]
    const third = uv[index + 1]
    if (first === undefined || second === undefined || third === undefined) continue
    triangles.push({ points: [first, second, third] })
  }

  return { triangles, normal }
}

function createFaceTexture(number: number, faces: number, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = FACE_SIZE
  canvas.height = FACE_SIZE
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('无法创建骰子纹理')

  const gradient = context.createLinearGradient(0, 0, 0, FACE_SIZE)
  gradient.addColorStop(0, SCENE.faceLight)
  gradient.addColorStop(1, SCENE.faceDark)
  context.fillStyle = gradient
  context.fillRect(0, 0, FACE_SIZE, FACE_SIZE)

  context.strokeStyle = SCENE.faceEdge
  context.lineWidth = 10
  context.strokeRect(5, 5, FACE_SIZE - 10, FACE_SIZE - 10)

  if (faces === 6) {
    drawPips(context, number)
  } else {
    drawNumber(context, number, faces)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  texture.needsUpdate = true
  return texture
}

function drawNumber(context: CanvasRenderingContext2D, number: number, faces: number): void {
  const size = faces === 20 ? 92 : faces === 10 ? 108 : 112
  context.fillStyle = SCENE.ink
  context.font = '600 ' + size + 'px "SF Mono", "Cascadia Code", Consolas, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(number), FACE_SIZE / 2, FACE_SIZE / 2 + 4)
}

function drawPips(context: CanvasRenderingContext2D, number: number): void {
  const layouts: Record<number, readonly (readonly [number, number])[]> = {
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7]],
    4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    5: [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
    6: [[0.3, 0.26], [0.3, 0.5], [0.3, 0.74], [0.7, 0.26], [0.7, 0.5], [0.7, 0.74]]
  }
  const positions = layouts[number] ?? layouts[1] ?? []
  context.fillStyle = SCENE.ink

  for (const [x, y] of positions) {
    context.beginPath()
    context.arc(x * FACE_SIZE, y * FACE_SIZE, 17, 0, Math.PI * 2)
    context.fill()
  }
}
