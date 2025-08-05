import fs from "fs/promises"
import JSZip from "jszip"
import { redis } from "./redis.server"

export async function unzipCbz(path: string) {
  const cached = await redis.get(`cbz:${path}`)
  if (cached) {
    return JSON.parse(cached) as { name: string, base64: string }[]
  }

  const buf = await fs.readFile(path)
  const zip = new JSZip()
  await zip.loadAsync(buf as Uint8Array)
  const promises = [] as Promise<string>[]
  zip.forEach((file) => {
    const f = zip.file(file)
    if (f) {
      promises.push(f.async('base64'))
    }
  })
  const files = await Promise.all(promises)
  const result = files.map((f, i) => {
    return {
      name: Object.keys(zip.files)[i],
      base64: f,
    }
  })
  // cache for 1 day
  await redis.set(`cbz:${path}`, JSON.stringify(result), 'EX', 60 * 60 * 24)
  return result
}