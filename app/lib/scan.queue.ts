import { registerQueue } from './queue.server'
import fs from 'fs/promises'
import { redis } from './redis.server'
import { extractFilenameParts } from './naming'
import { STORAGE_PATH } from './config.server'

export type ScanPayload = {
  path: string
}

export const scanQueue = registerQueue<ScanPayload>('scan', async (job) => {
  job.updateProgress(0)
  await redis.del('files')
  const files = await fs.readdir(job.data.path, { recursive: true, withFileTypes: true })

  let totalIdentified = 0
  for (const file of files) {
    job.log(`Processing ${file.name}`)
    if (file.isFile()) {
      const parts = extractFilenameParts(file.name)
      const data = {
        path: file.path,
        name: file.name,
        parts
      }

      if (parts) {
        totalIdentified++
      }

      await redis.sadd('files', JSON.stringify(data))
    }

    job.updateProgress(files.indexOf(file) / files.length)
  }
  job.updateProgress(1)

  return { totalIdentified, totalRead: files.length }
})

export type ScanResult = {
  path: string // dirname
  name: string // filename
  parts: ReturnType<typeof extractFilenameParts>
}

export async function getFiles() {
  const data = await redis.smembers('files')
  return data.map((d) => JSON.parse(d) as ScanResult).sort((a, b) => {
    const firstOrder = (a.parts?.comic_title || '').localeCompare(a.parts?.comic_title || '')
    if (firstOrder === 0) {
      return Number(b.parts?.chapter_number || 0) - Number(a.parts?.chapter_number || 0)
    }
    return firstOrder
  })
}

export async function scanFiles() {
  return scanQueue.add('scan', { path: STORAGE_PATH }, {
    // only store the last scan job, whether it completes or fails
    removeOnComplete: { count: 1 },
    removeOnFail: { count: 1 }
  })
}
