import { threadId } from 'node:worker_threads'
import puppeteer, { type Page, type Viewport } from 'puppeteer'
import { version } from '../../package.json'
import { storeFile } from './file-utils'
import { computeStylesheetURL, processMarkup } from './parse-utils'

const USER_AGENT = `Doctolib Static SEO Page Generator/${version}`
const VIEWPORT: Viewport = { width: 1024, height: 768 }

// Display "expected" worker indices. (1-2 are used by Node's internals.)
const WORKER_ID = threadId - 2

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
    const nextPage = await processPage(page, url, { stylesheetURL })

    if (nextPage) {
      urls.push(nextPage)
    }

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

  const { trimmedMarkup, nextPage } = processMarkup(markup, {
    url,
    stylesheetURL,
  })
  storeFile(url, trimmedMarkup)
  return nextPage
}
