import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mkdir, rm } from 'node:fs/promises'
import React from 'react'
import { renderToStaticNodeStream } from 'react-dom/server'
import { resolve } from 'node:path'

import { CHARACTER_IDS } from '../src/api/characters.ts'
import PageWrapper from './PageWrapper.tsx'
import { prefetchCharacters } from './PrefetchingClient.ts'

const OUTPUT_PATH = fileURLToPath(new URL('./output', import.meta.url))

run()

function renderCharacterPage(id: number) {
  const fileName = `character-${id}.html`
  const filePath = resolve(OUTPUT_PATH, fileName)
  const stream = renderToStaticNodeStream(<PageWrapper id={id} />)
  stream.pipe(createWriteStream(filePath, { encoding: 'utf-8' }))
}

async function run() {
  await rm(OUTPUT_PATH, { recursive: true, force: true })
  await mkdir(OUTPUT_PATH, { recursive: true })

  console.log('Prefetching character data…')
  // This is the part that needs some coupling with the pages we render:
  // It has to know about their query keys and query functions. See impl.
  await prefetchCharacters(CHARACTER_IDS)

  console.log('Generating pages for characters…')
  for (const id of CHARACTER_IDS) {
    renderCharacterPage(id)
  }

  console.log('Done!')
}
