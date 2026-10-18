import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const srcRoot = join(process.cwd(), 'src')
const violations = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      await inspect(full)
    }
  }
}

async function inspect(file) {
  const source = await readFile(file, 'utf8')
  const code = file.endsWith('.vue') ? scriptBlocks(source) : source
  const from = layerOf(file)
  if (from === null) return

  for (const spec of importsOf(code)) {
    const to = targetOf(spec, file)
    const message = checkRule(from, to)
    if (message !== null) {
      violations.push(relative(process.cwd(), file) + ' -> ' + spec + '  ' + message)
    }
  }
}

function scriptBlocks(source) {
  const blocks = []
  const pattern = /<script[^>]*>([\s\S]*?)<\/script>/g
  let match
  while ((match = pattern.exec(source)) !== null) blocks.push(match[1] ?? '')
  return blocks.join('\n')
}

function importsOf(code) {
  const specs = new Set()
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      if (match[1] !== undefined) specs.add(match[1])
    }
  }
  return specs
}

function layerOf(file) {
  const rel = relative(srcRoot, file).replaceAll('\\', '/')
  if (rel.startsWith('contracts/')) return { kind: 'contracts' }
  if (rel.startsWith('kernel/')) return { kind: 'kernel' }
  if (rel.startsWith('platforms/')) return { kind: 'platforms' }
  if (rel.startsWith('main/')) return { kind: 'main' }
  if (rel.startsWith('preload/')) return { kind: 'preload' }
  if (rel.startsWith('renderer/')) return { kind: 'renderer' }
  if (rel.startsWith('tools/')) {
    const [, id, area] = rel.split('/')
    return { kind: 'tool', id, area: area ?? 'root' }
  }
  return null
}

function targetOf(spec, fromFile) {
  if (spec.startsWith('@contracts')) return { kind: 'contracts' }
  if (spec.startsWith('@kernel')) return { kind: 'kernel' }
  if (spec.startsWith('@platforms')) return { kind: 'platforms' }
  if (spec.startsWith('@renderer')) return { kind: 'renderer' }
  if (spec.startsWith('@tools/')) {
    const [, id] = spec.split('/')
    return { kind: 'tool', id }
  }

  if (spec.startsWith('.')) {
    const absolute = resolve(dirname(fromFile), spec)
    return layerOf(absolute) ?? { kind: 'relative' }
  }

  return { kind: 'package', name: spec }
}

function checkRule(from, to) {
  if (from.kind === 'contracts') {
    if (to.kind === 'contracts' || (to.kind === 'package' && to.name === 'zod')) return null
    return 'contracts 只能依赖 zod 与自身'
  }

  if (from.kind === 'kernel') {
    if (to.kind === 'contracts' || to.kind === 'kernel') return null
    return 'kernel 不能依赖 ' + describe(to)
  }

  if (from.kind === 'platforms') {
    if (to.kind === 'contracts' || to.kind === 'platforms') return null
    if (to.kind === 'package' && (to.name === 'ws' || to.name === 'zod' || to.name.startsWith('node:'))) {
      return null
    }
    return 'platforms 不能依赖 ' + describe(to)
  }

  if (from.kind === 'tool') {
    if (to.kind === 'contracts') return null
    if (to.kind === 'tool' && to.id === from.id) {
      if (from.area === 'domain' && to.area === 'physics') {
        return 'domain 不能依赖 physics'
      }
      return null
    }
    if (from.area === 'physics' && to.kind === 'package' && to.name === 'cannon-es') return null
    return 'tools 不能依赖 ' + describe(to)
  }

  if (from.kind === 'preload') {
    if (to.kind === 'contracts' || to.kind === 'preload') return null
    if (to.kind === 'package' && to.name === 'electron') return null
    return 'preload 不能依赖 ' + describe(to)
  }

  if (from.kind === 'renderer') {
    if (to.kind === 'contracts' || to.kind === 'renderer') return null
    if (to.kind === 'package' && (to.name === 'vue' || to.name === 'three')) return null
    return 'renderer 不能依赖 ' + describe(to)
  }

  return null
}

function describe(target) {
  if (target.kind === 'package') return target.name
  if (target.kind === 'tool') return 'tools/' + String(target.id)
  return target.kind
}

await walk(srcRoot)

if (violations.length > 0) {
  console.error('依赖边界检查失败：')
  for (const violation of violations) console.error('  ' + violation)
  process.exit(1)
}

console.log('依赖边界检查通过。')
