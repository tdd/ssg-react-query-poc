import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, workerData } from 'node:worker_threads'
import { launchWorker } from './worker'

const WORKER_COUNT = 4

const PLACES = ['paris', 'strasbourg']
const SPECIALTIES = [
  'osteopathe',
  'radiologue',
  'orthophoniste',
  'psychiatre',
  'psychologue',
  'anesthesiste',
  'cardiologue',
  'chirurgien',
  'chirurgien-plastique',
]

function computeURLs() {
  const result = Array.from({ length: WORKER_COUNT }, () => [] as string[])
  let bucketIndex = 0
  for (const specialty of SPECIALTIES) {
    for (const place of PLACES) {
      result[bucketIndex].push(`https://www.doctolib.fr/${specialty}/${place}`)
      bucketIndex = (bucketIndex + 1) % WORKER_COUNT
    }
  }
  return result
}

if (isMainThread) {
  launchGrabber()
} else {
  launchWorker(workerData)
}

async function launchGrabber() {
  const urlGroups = computeURLs()

  const start = performance.now()
  console.log('Grabbing pages…')
  const workers = urlGroups.map(spawnWorkerForURLGroup)
  await Promise.all(workers)
  console.log('All done in', performance.now() - start)
}

function spawnWorkerForURLGroup(urls: string[], index: number) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { urls, extractStylesheet: index === 0 },
    })
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(`Worker exited with code ${code}`)
      } else {
        resolve(undefined)
      }
    })
  })
}
