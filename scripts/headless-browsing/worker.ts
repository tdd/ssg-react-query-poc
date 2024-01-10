import { parse as parseHTML } from 'node-html-parser'
import { mkdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve as resolvePaths } from 'node:path'
import { fileURLToPath } from 'node:url'
import { threadId } from 'node:worker_threads'
import puppeteer, { type Page, type Viewport } from 'puppeteer'
import { version } from '../../package.json'

const STORAGE_PATH = resolvePaths(fileURLToPath(import.meta.url), '../output')
mkdirSync(STORAGE_PATH, { recursive: true })

const USER_AGENT = `Doctolib Static SEO Page Generator/${version}`

const VIEWPORT: Viewport = { width: 1024, height: 768 }

const WORKER_ID = threadId - 2 // 0-2 are used by Node's internals

async function computeResultPath(url: string) {
  const directory = resolvePaths(
    STORAGE_PATH,
    url.replace('https://www.doctolib.fr/', './')
  )
  await mkdir(directory, { recursive: true })
  return resolvePaths(directory, 'index.html')
}

async function computeStylesheetURL({
  actualExtraction,
  url,
  page,
}: {
  actualExtraction: boolean
  page: Page
  url: string
}) {
  if (actualExtraction) {
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
  }

  return '/search-stylesheet.css'
}

type WorkerOptions = {
  urls: string[]
  extractStylesheet: boolean
}

export async function launchWorker({ urls, extractStylesheet }: WorkerOptions) {
  const runTimes = {
    puppeteer: 0,
    styles: 0,
    pages: [] as number[],
    averagePage: 0,
  }
  console.log(`Launching worker ${WORKER_ID}…`)
  let start = performance.now()
  const browser = await puppeteer.launch({
    headless: 'new',

    defaultViewport: VIEWPORT,
  })
  const page = await browser?.newPage()
  page.setUserAgent(USER_AGENT)
  runTimes.puppeteer = performance.now() - start

  start = performance.now()
  const stylesheetURL = await computeStylesheetURL({
    actualExtraction: extractStylesheet,
    page: page as Page,
    url: urls.at(-1) as string,
  })
  runTimes.styles = performance.now() - start

  for (const url of urls) {
    console.log(`- ${WORKER_ID} - ${url}…`)
    start = performance.now()
    await processPage(page, url, { stylesheetURL })
    runTimes.pages.push(performance.now() - start)
  }

  start = performance.now()
  await browser.close()
  runTimes.puppeteer += performance.now() - start

  if (process.env.BENCHMARK) {
    if (runTimes.pages.length > 0) {
      runTimes.averagePage =
        runTimes.pages.reduce((acc, t) => acc + t, 0) / runTimes.pages.length
    }
    console.log(`Worker ${WORKER_ID} done!`, runTimes)
  } else {
    console.log(`Worker ${WORKER_ID} done!`)
  }
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
