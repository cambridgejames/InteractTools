#!/usr/bin/env node
/**
 * 生成 GitHub Release 说明。
 *
 * 数据源只有 CHANGELOG.md：取最近一个 tag 之后的全部小节（新的在前），
 * 没有 tag 时取全部非空小节。
 *
 * 运行：node scripts/release-notes.mjs > RELEASE_NOTES.md
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function sections(text) {
  const result = []
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^## \[([^\]]+)\]/.exec(lines[index])
    if (heading === null) continue
    const body = []
    for (let next = index + 1; next < lines.length; next += 1) {
      if (lines[next].startsWith('## ') || lines[next].startsWith('[')) break
      body.push(lines[next])
    }
    const trimmed = body.join('\n').trim()
    if (trimmed.length > 0) result.push({ version: heading[1], body: trimmed })
  }
  return result
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const all = sections(changelog)
const previous = git(['describe', '--tags', '--abbrev=0']).replace(/^v/, '')
const start = all.findIndex((section) => section.version === previous)
const selected = start >= 0 ? all.slice(0, start) : all
const chosen = selected.length > 0 ? selected : all
const body = chosen.map((section) => '### ' + section.version + '\n\n' + section.body).join('\n\n')

const repo = process.env.GITHUB_REPOSITORY ?? 'cambridgejames/InteractTools'
const tag = process.env.GITHUB_REF_NAME || git(['describe', '--tags', '--abbrev=0']) || 'dev'
process.stdout.write(
  '# ' + tag + '\n\n' +
  '互动工坊桌面端发布。\n\n' +
  '## 更新详情\n\n' +
  (body || '本次没有可展示的更新条目。') + '\n\n' +
  '## 下载\n\n' +
  '选择对应平台与架构的安装包；Windows 提供 setup、portable 与 zip。\n\n' +
  '完整历史：[CHANGELOG.md](https://github.com/' + repo + '/blob/main/CHANGELOG.md)\n'
)
if (previous === '') {
  console.error('release-notes: 未找到上一个 tag，已输出全部非空 CHANGELOG 小节。')
}
