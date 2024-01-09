import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, workerData } from 'node:worker_threads'
import { launchWorker } from './worker'

const WORKER_COUNT = 2

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

  console.log('Grabbing pages…')
  const workers = urlGroups.map(spawnWorkerForURLGroup)
  await Promise.all(workers)
  console.log('Done!')
}

function spawnWorkerForURLGroup(urls: string[]) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: urls,
    })
    const id = worker.threadId
    worker.on('error', reject)
    worker.on('exit', (code) => {
      console.log('Worker exit:', id, 'code:', code)
      if (code !== 0) {
        reject(`Worker exited with code ${code}`)
      } else {
        resolve(undefined)
      }
    })
  })
}
