import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src', 'renderer')
const tokenFile = join(root, 'src', 'styles', 'tokens.css')
const violations = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
    } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.css')) {
      await check(full)
    }
  }
}

async function check(file) {
  if (file === tokenFile) return

  const source = await readFile(file, 'utf8')
  const blocks = file.endsWith('.vue') ? styleBlocks(source) : [{ content: source, offset: 0 }]

  for (const block of blocks) {
    const lines = block.content.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('design-exception')) return
      const lineNumber = block.offset + index + 1
      if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /\brgba?\(/.test(line)) {
        violations.push(relative(process.cwd(), file) + ':' + lineNumber + '  ' + line.trim())
      }
    })
  }
}

function styleBlocks(source) {
  const blocks = []
  const pattern = /<style[^>]*>([\s\S]*?)<\/style>/g
  let match
  while ((match = pattern.exec(source)) !== null) {
    const content = match[1] ?? ''
    const offset = source.slice(0, match.index).split('\n').length - 1
    blocks.push({ content, offset })
  }
  return blocks
}

await walk(root)

if (violations.length > 0) {
  console.error('设计 token 检查失败：组件里出现了裸颜色，请改用 var(--...)：')
  for (const violation of violations) console.error('  ' + violation)
  process.exit(1)
}

console.log('设计 token 检查通过。')
