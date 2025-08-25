import { registerQueue } from "./queue.server"
import fs from 'fs/promises'
import path from 'path'
import JSZip from "jszip"
import { Queue } from "bullmq"
import { STORAGE_PATH } from "./config.server"
import { getFilenameForChapter } from "./naming"
import { scanFiles } from "./scan.queue"
import { getChapterImages } from "./content.server"

async function fileExists(filename: string) {
  try {
    await fs.access(filename, fs.constants.R_OK) // check file exists and is readable
    return true
  } catch (err) {
    return false
  }
}

export type DownloadPayload = {
  // used for download processing
  chapter_id: string
  // this contains info used for the job list UI
  meta: DownloadMeta
}
export type DownloadMeta = {
  lang: string
  comic_id: string
  comic_title: string
  chapter_title: string
  chapter_number: number
  vol_number: number
  fansub_group: string
}

export const downloadQueue = registerQueue<DownloadPayload>('download', async (job) => {
  const id = job.data.chapter_id
  const comic_title = job.data.meta.comic_title
  const filename = getFilenameForChapter(job.data.meta)
  const urls = await getChapterImages(id)

  job.updateProgress(0)

  const zip = new JSZip()
  for (const image of urls) {
    const res = await fetch(image.url)
    if (!res.ok) {
      throw new Error(`Failed to download image: ${image.url} ${res.status} ${res.statusText}`)
    }

    const buffer = await res.arrayBuffer()
    zip.file(image.key, buffer)

    job.updateProgress((urls.indexOf(image) + 1) / urls.length)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const dir = path.join(STORAGE_PATH, comic_title)
  const _path = path.join(dir, filename)

  if (!await fileExists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }

  await fs.writeFile(_path, zipBuffer)
  await scanFiles()

  return _path
}) as Queue<DownloadPayload, string>

export async function clearDownloadQueue() {
  // clean last 5000 'failed' jobs in a maximum of 30 seconds
  await downloadQueue.clean(30 * 1000, 5000, 'failed')
  // clean last 5000 'completed' jobs in a maximum of 30 seconds
  await downloadQueue.clean(30 * 1000, 5000, 'completed')
}

export async function retryDownload(id: string) {
  const jobs = await downloadQueue.getJobs('failed')
  const job = jobs.find((j) => j.data.chapter_id === id)
  await job?.retry()
}

export async function downloadChapter(id: string, meta: DownloadMeta) {
  return downloadQueue.add(
    `Download chapter ${id}`,
    { chapter_id: id, meta },
    {
      // remove instantly jobs that complete without errors
      removeOnComplete: true,
      // keep a max of 10 jobs for 24 hours
      removeOnFail: { age: 60 * 60 * 24, count: 10 },
      // retry at most 2 times (after the first attempt, reaching a total 3 attempts)
      attempts: 3,
      // attempts will be spaced 1 second, 2 seconds, and 4 seconds respectively
      backoff: { type: 'exponential', delay: 1000 }
    }
  )
}
