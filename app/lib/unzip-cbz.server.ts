import fs from "fs/promises"
import JSZip from "jszip"

export async function unzipCbz(path: string) {
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
  return files.map((f, i) => {
    return {
      name: Object.keys(zip.files)[i],
      base64: f,
    }
  })
}