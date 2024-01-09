import { mkdirSync } from 'node:fs'
import { resolve as resolvePaths } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { parse as parseHTML } from 'node-html-parser'
import { threadId } from 'node:worker_threads'
import puppeteer, { type Page, type Viewport } from 'puppeteer'
import { fileURLToPath } from 'node:url'

const STORAGE_PATH = resolvePaths(fileURLToPath(import.meta.url), '../output')
mkdirSync(STORAGE_PATH, { recursive: true })

const VIEWPORT: Viewport = { width: 1024, height: 768 }

async function computeResultPath(url: string) {
  const directory = resolvePaths(
    STORAGE_PATH,
    url.replace('https://www.doctolib.fr/', './')
  )
  await mkdir(directory, { recursive: true })
  return resolvePaths(directory, 'index.html')
}

async function computeStylesheetURL({
  url,
  page,
}: {
  page: Page
  url: string
}) {
  // Unfortunately, Chromium's CSS Coverage API (hence Puppeteer's) has issues with
  // range boundaries within media queries, causing breakages due to missing closing
  // curlies for MQ-wrapped contents. (It also ignores @font-face declarations, but we
  // could work around that.)  So until these are fixed, we have no choice but to keep
  // the entire, bloated CSS (718K instead of 92K at the time of this writing).
  const styles: string[] = []

  page.on('response', async (response) => {
    if (response.request().resourceType() === 'stylesheet') {
      styles.push(await response.text())
    }
  })

  await page.goto(url, { waitUntil: 'networkidle2' })
  page.off('response')

  const stylesheet = styles.join('\n')
  const path = await resolvePaths(STORAGE_PATH, 'search-stylesheet.css')
  await writeFile(path, stylesheet, 'utf-8')

  return '/search-stylesheet.css'
}

export async function launchWorker(urls: string[]) {
  console.log(`Launching worker ${threadId}…`)
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: VIEWPORT,
  })
  const page = await browser.newPage()
  const stylesheetURL = await computeStylesheetURL({ page, url: urls[0] })

  for (const url of urls) {
    console.log(`- ${threadId} - ${url}…`)
    await processPage(page, url, { stylesheetURL })
  }

  await browser.close()

  console.log(`Worker ${threadId} done!`)
}

async function processPage(
  page: Page,
  url: string,
  { stylesheetURL }: { stylesheetURL: string }
) {
  await page.goto(url, { waitUntil: 'networkidle2' })
  const markup = await page.content()
  await saveMarkup({ url, markup, stylesheetURL })
}

async function saveMarkup({
  url,
  markup,
  stylesheetURL,
}: {
  url: string
  markup: string
  stylesheetURL: string
}) {
  markup = trimMarkup(markup, { stylesheetURL })
  return writeFile(await computeResultPath(url), markup, 'utf-8')
}

function trimMarkup(
  markup: string,
  { stylesheetURL }: { stylesheetURL: string }
) {
  const root = parseHTML(markup)
  root
    .querySelectorAll(
      'script:not([type="application/ld+json"]), link[rel="stylesheet"]'
    )
    .forEach((n) => n.remove())

  for (const node of root.querySelectorAll('*')) {
    node.removeAttribute('data-test')
    node.removeAttribute('data-test-id')
    node.removeAttribute('data-props')
    node.removeAttribute('data-design-system')
    node.removeAttribute('data-design-system-component')
    node.removeAttribute('data-icon-name')
  }
  root
    .querySelector('head')
    ?.insertAdjacentHTML(
      'beforeend',
      `<link rel="stylesheet" href="${stylesheetURL}"/>`
    )
  root.removeWhitespace()
  return root.toString()
}
