#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'

const root = process.cwd()
const skipDirs = new Set(['node_modules', 'out', 'release', 'artifacts', '.git', 'dist'])
const errors = []

function walk(dir) {
  const result = []
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) result.push(...walk(full))
    else if (name.endsWith('.md')) result.push(full)
  }
  return result
}

function fail(file, message) {
  errors.push(relative(root, file) + ': ' + message)
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '')
}

function headings(text) {
  const anchors = new Set()
  for (const line of stripCode(text).split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/)
    if (!match) continue
    const raw = match[1].toLowerCase()
    const slug = raw
      .replace(/[^\p{L}\p{N}\- ]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
    anchors.add(slug)
  }
  return anchors
}

function checkFile(file) {
  const buffer = readFileSync(file)
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail(file, '文件带 UTF-8 BOM')
  }
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    fail(file, '不是合法 UTF-8')
    return
  }
  if (/\b(TBD|FIXME)\b|待补充/.test(text)) fail(file, '包含占位符 TBD/FIXME/待补充')

  const visible = stripCode(text)
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g
  let match
  while ((match = linkPattern.exec(visible)) !== null) {
    const raw = match[1].trim()
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('mailto:') || raw.startsWith('#')) continue
    const [pathPart, anchor] = raw.split('#')
    if (pathPart.length === 0) continue
    const target = resolve(dirname(file), decodeURIComponent(pathPart))
    if (!existsSync(target)) {
      fail(file, '链接目标不存在: ' + pathPart)
      continue
    }
    if (anchor !== undefined && anchor.length > 0 && target.endsWith('.md')) {
      const anchors = headings(readFileSync(target, 'utf8'))
      if (!anchors.has(anchor)) fail(file, '锚点不存在: ' + raw)
    }
  }
}

function checkSkill(file) {
  const text = readFileSync(file, 'utf8')
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (match === null) {
    fail(file, '缺少 frontmatter')
    return
  }
  for (const key of ['name:', 'description:']) {
    if (!match[1].includes(key)) fail(file, 'frontmatter 缺少 ' + key)
  }
}

function checkDesignIndex() {
  const dir = join(root, 'docs', 'design')
  const index = join(dir, 'README.md')
  if (!existsSync(index)) return
  const text = readFileSync(index, 'utf8')
  for (const name of readdirSync(dir).filter((item) => item.endsWith('.md') && item !== 'README.md')) {
    if (!text.includes('(' + name + ')')) fail(index, '设计索引缺少 ' + name)
    const file = join(dir, name)
    const body = readFileSync(file, 'utf8')
    const required = name === 'ui-guidelines.md'
      ? ['**状态**', '**最后更新**']
      : ['**状态**', '**最后更新**', '## 1. 背景', '### 1.1 修改历史']
    for (const token of required) {
      if (!body.includes(token)) fail(file, '设计文档缺少 ' + token)
    }
  }
}

function checkRoadmapIndex() {
  const dir = join(root, 'docs', 'roadmap')
  if (!existsSync(dir)) return
  const index = join(dir, 'README.md')
  if (!existsSync(index)) return
  const text = readFileSync(index, 'utf8')
  for (const name of readdirSync(dir).filter((item) => item.endsWith('.md') && item !== 'README.md')) {
    if (!text.includes('(' + name + ')')) fail(index, '路线图索引缺少 ' + name)
  }
}

const files = walk(root)
for (const file of files) checkFile(file)
for (const file of walk(join(root, '.agents', 'skills')).filter((item) => item.endsWith('SKILL.md'))) checkSkill(file)
checkDesignIndex()
checkRoadmapIndex()

if (errors.length > 0) {
  console.error('文档校验失败：')
  for (const error of errors) console.error('  ' + error)
  process.exit(1)
}
console.log('文档校验通过：' + files.length + ' 个 Markdown 文件。')
