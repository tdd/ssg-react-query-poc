import { parse as parseHTML } from 'node-html-parser'
import type { Page } from 'puppeteer'
import { storeFile } from './file-utils'

// Avoid fetching the entire paginated set in non-prod mode
const MAX_PAGE = process.env.NODE_ENV === 'production' ? +Infinity : 5

export async function computeStylesheetURL({
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
    await storeFile('search-stylesheet.css', stylesheet)
  }

  return '/search-stylesheet.css'
}

export function processMarkup(
  markup: string,
  { url, stylesheetURL }: { url: string; stylesheetURL: string }
) {
  const result = { trimmedMarkup: '', nextPage: '' }

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
  result.trimmedMarkup = root.toString()

  const nextPage = root.querySelector('link[rel="next"]')?.getAttribute('href')

  if (nextPage) {
    const nextURL = new URL(nextPage, url)
    if (Number(nextURL.searchParams.get('page') || '1') <= MAX_PAGE) {
      result.nextPage = nextURL.toString()
    }
  }

  return result
}
