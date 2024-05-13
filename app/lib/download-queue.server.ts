import { getJSON } from "@/request"
import { registerQueue } from "./queue.server"
import { BASE_URL, IMAGE_PREFIX } from "@/config"
import fs from 'fs/promises'
import { ImageProps } from "@/components/Image"
import path from 'path'
import JSZip from "jszip"
import { Queue } from "bullmq"
import { STORAGE_PATH } from "./config.server"

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
  chapter_title: string
  chapter_number: string
  comic_title: string
}

type Chapter = {
  seoTitle: string
  chapter: {
    md_images: ImageProps[]
  }
}

export const downloadQueue = registerQueue<DownloadPayload>('download', async (job) => {
  const id = job.data.chapter_id
  const comic_title = job.data.meta.comic_title
  const data = await getJSON<Chapter>(`${BASE_URL}/chapter/${id}`)

  const urls = data.chapter.md_images.map((image) => ({
    url: `${IMAGE_PREFIX}/${image.b2key}`,
    key: image.b2key
  }))

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
  const _path = path.join(dir, `${data.seoTitle}.cbz`)

  if (!await fileExists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }

  await fs.writeFile(_path, zipBuffer)
  return _path
}) as Queue<DownloadPayload, string>
