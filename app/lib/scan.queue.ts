import { registerQueue } from './queue.server'
import fs from 'fs/promises'
import { redis } from './redis.server'
import { STORAGE_PATH } from './config.server'

export type ScanPayload = {
  path: string
}

export const scanQueue = registerQueue<ScanPayload>('scan', async (job) => {
  job.updateProgress(0)
  const files = await fs.readdir(job.data.path, { recursive: true, withFileTypes: true })
  for (const file of files) {
    job.log(`Processing ${file.name}`)
    if (file.isFile()) {
      // do something with the file
      const fileRegex = /Chapter (.*) \((.*)\) - (.*)\.cbz$/
      const matches = file.name.match(fileRegex) || []
      const data = {
        path: file.path,
        name: file.name,
        chapter: matches[1],
        lang: matches[2],
        series: matches[3]
      }

      await redis.sadd('files', JSON.stringify(data))
    }

    job.updateProgress(files.indexOf(file) / files.length)
  }
  job.updateProgress(1)
})

export type ScanResult = {
  path: string // dirname
  name: string // filename
  chapter: string
  series: string
  lang: string
}

export async function getFiles() {
  const data = await redis.smembers('files')
  return data.map((d) => JSON.parse(d) as ScanResult).sort((a, b) => {
    const firstOrder = (a.series || '').localeCompare(b.series || '')
    if (firstOrder === 0) {
      return Number(b.chapter || 0) - Number(a.chapter || 0)
    }
    return firstOrder
  })
}

export async function readStorage() {
  const files = await fs.readdir(STORAGE_PATH, { recursive: true, withFileTypes: true })
  return files.filter(f => f.isFile()).map(f => ({
    path: f.path,
    name: f.name
  }))
}
