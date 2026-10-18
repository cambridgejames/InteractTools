import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function readJsonFile(path: string): Promise<unknown | null> {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text) as unknown
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = path + '.tmp'
  await writeFile(temp, JSON.stringify(value, null, 2), 'utf8')
  await rm(path, { force: true })
  await rename(temp, path)
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
