import type { DownloadMeta } from "./download-queue.server"

export const FILE_REGEX = /^(.*)( Vol\. \d+)?( #\d+)( - .*)? \((.*)\) \[(.*)\]\[(\w+)\].cbz$/

export function getFilenameForChapter(meta: DownloadMeta) {
  let base = `${meta.comic_title}`
  if (meta.vol_number) {
    base += ` Vol. ${meta.vol_number}`
  }
  base += ` #${meta.chapter_number}`
  if (meta.chapter_title) {
    base += ` - ${meta.chapter_title}`
  }
  base += ` (${meta.lang})`
  base += ` [${meta.fansub_group}][${meta.comic_id}].cbz`
  return base
}

export function extractFilenameParts(filename: string) {
  const matches = filename.match(FILE_REGEX)
  if (!matches) return null

  const [, comic_title, vol_number, chapter_number, chapter_title, lang, fansub_group, comic_id] = matches
  return {
    comic_id,
    comic_title,
    chapter_title: chapter_title?.slice(3), // Remove " - " prefix if exists
    chapter_number: chapter_number.slice(2), // Remove " #" prefix
    fansub_group,
    vol_number: vol_number.slice(5), // Remove "Vol. " prefix,
    lang,
  }
}
