import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import {
  dirname,
  extname,
  resolve as resolvePaths,
  sep as pathSeparator,
} from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

const STORAGE_PATH = resolvePaths(fileURLToPath(import.meta.url), '../output')
mkdirSync(STORAGE_PATH, { recursive: true })

export async function storeFile(path: string, content: string) {
  path = resolvePaths(
    STORAGE_PATH,
    path.replace('https://www.doctolib.fr/', './')
  )

  if (path.includes('?page=')) {
    path = path.replace(/\?page=(\d+)/, `${pathSeparator}page-$1.html`)
  } else if (!extname(path)) {
    path = resolvePaths(path, 'index.html')
  }

  const directory = extname(path) ? dirname(path) : path
  await mkdir(directory, { recursive: true })

  await writeFile(path, content, 'utf-8')
}
